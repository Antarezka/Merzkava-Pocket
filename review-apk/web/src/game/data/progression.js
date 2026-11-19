// Character development: Level -> stat points -> Meridian node web -> final stats.
// Design (from the project brief):
//   * level cap 666 (content currently ends at Lv 100); +3 stat points per level-up (1,995 points from level 1 -> 666 with zero start)
//   * levelling NEVER raises an attribute by itself - points are spent to activate nodes (6 points each) in an interconnected web
//   * a node can only be activated when it touches an already-active node (the Origin is always active); only ACTIVE nodes give stats
//   * final stats = combined base stats + modifiers from several independent sources (nodes, equipment, class, specialist weapon, cultivation, pets, ...)
//     flat bonuses are summed per source, percentage modifiers are summed and applied on top (cultivation can also give penalties)
// Pure data + maths: no DOM, no engine imports.
export const LEVEL_CAP = 666, POINTS_PER_LEVEL = 3, NODE_COST = 6;
export const levelPoints = (lv) => POINTS_PER_LEVEL * Math.max(0, Math.min(LEVEL_CAP, lv) - 1);          // 1995 at the cap
export const TOTAL_LEVEL_POINTS = levelPoints(LEVEL_CAP);

// ---------------------------------------------------------------- stat definitions
export const ATTRS = ["str", "dex", "agi", "vit", "spi"];
export const STAT = {
  str: ["Strength", "", "ATK +2.2, Max HP +2"], dex: ["Dexterity", "", "ATK +0.6, Crit chance +0.18%"], agi: ["Agility", "", "Swing speed, Evade, DEF +0.25"],
  vit: ["Vitality", "", "Max HP +14, DEF +0.5"], spi: ["Spirit", "", "Chant Time Reduction +0.2%, Skill damage +0.6%"],
  crit: ["Crit chance", "%"], critDmg: ["Crit damage", "%"], cdr: ["Chant Time Reduction", "%"], evade: ["Evade", "%"], haste: ["Swing speed", "%"],
  regen: ["HP regen", "%/s"], expPct: ["EXP gain", "%"], dropPct: ["Loot & book luck", "%"], skillPct: ["Skill damage", "%"],
  atk: ["ATK", "%"], maxHp: ["Max HP", "%"], def: ["DEF", "%"],
};
const PCT_KEYS = new Set(["atk", "maxHp", "def"]);   // these are % multipliers of the derived stat; everything else in fx.flat is a flat value

// ---------------------------------------------------------------- the node web (generated; deterministic)
export const RINGS = 10;
const RING_NAME = ["Mortal", "Tempered", "Hardened", "Refined", "Awakened", "Radiant", "Profound", "Heavenly", "Sovereign", "Transcendent"];
export const BRANCHES = [
  { id: "str", name: "Tiger Sinew", col: "#e0584a", ang: -90, main: "str", l: ["atk", "pct"], r: ["critDmg", "flat"], base: ["Tiger Sinew", "Mountain Grip", "Splitting Wrist"], key: ["Mountain-Breaking Fist", "Tiger God Awakening"] },
  { id: "dex", name: "Falcon Eye", col: "#e9c46a", ang: -30, main: "dex", l: ["crit", "flat"], r: ["skillPct", "flat"], base: ["Falcon Eye", "Needle Focus", "Piercing Gaze"], key: ["Hundred-Pace Aim", "Sky Falcon Insight"] },
  { id: "agi", name: "Crane Step", col: "#6fdc8a", ang: 30, main: "agi", l: ["evade", "flat"], r: ["haste", "flat"], base: ["Crane Step", "Willow Dodge", "Swallow Turn"], key: ["Cloud-Treading Step", "Wind God Footwork"] },
  { id: "vit", name: "Iron Bone", col: "#7ab0ff", ang: 90, main: "vit", l: ["maxHp", "pct"], r: ["regen", "flat"], base: ["Iron Bone", "Tortoise Marrow", "Jade Skin"], key: ["Diamond Body", "Golden Bell Shroud"] },
  { id: "spi", name: "Thunder Breath", col: "#b58cff", ang: 150, main: "spi", l: ["cdr", "flat"], r: ["skillPct", "flat"], base: ["Thunder Breath", "Quick Chant", "Spirit Pulse"], key: ["Swift Incantation Seal", "Heavenly Thunder Heart"] },
  { id: "hid", name: "Hidden Gate", col: "#e7a8c4", ang: 210, main: null, l: ["expPct", "flat"], r: ["dropPct", "flat"], base: ["Hidden Gate", "Wanderer's Insight", "Fortune Seal"], key: ["Gate of Nine Fortunes", "Void Gate Awakening"] },
];
const LANE_CHAR = { s: 0, l: 1, r: 2 };
function mainFx(b, k, ring) {   // spine: the branch's attribute (Hidden Gate: a little of everything)
  const v = 3 + Math.floor(ring / 2);
  if (!b.main) return { flat: Object.fromEntries(ATTRS.map((a) => [a, Math.max(1, Math.round(v * 0.45))])) };
  return { flat: { [b.main]: v } };
}
function subFx(b, lane, ring) {
  const [key, kind] = lane === "l" ? b.l : b.r;
  const unit = { atk: 0.7, maxHp: 0.7, crit: 0.45, critDmg: 2.2, evade: 0.5, haste: 0.55, regen: 0.012, cdr: 0.8, skillPct: 0.9, expPct: 0.9, dropPct: 0.8 }[key] || 0.6;
  const val = Math.round((unit * (1 + ring * 0.55)) * 100) / 100, o = { flat: {}, pct: {} };
  if (kind === "pct") o.pct[key] = val; else o.flat[key] = val;
  if (ring >= 4) { const a = b.main || ATTRS[ring % 5]; o.flat[a] = Math.round(ring / 2); }
  return o;
}
function keyFx(b, ring) {       // keystones on the spine at ring 5 and 10: big, branch-defining
  const big = ring === 10, m = b.main || "vit", o = { flat: {}, pct: {} };
  if (b.main) o.flat[m] = big ? 22 : 10; else for (const a of ATTRS) o.flat[a] = big ? 9 : 4;
  const extra = { str: ["atk", "pct", 7], dex: ["crit", "flat", 4], agi: ["haste", "flat", 6], vit: ["maxHp", "pct", 8], spi: ["cdr", "flat", 7], hid: ["dropPct", "flat", 8] }[b.id];
  o[extra[1] === "pct" ? "pct" : "flat"][extra[0]] = extra[2] * (big ? 2 : 1);
  if (big) { o.flat.expPct = (o.flat.expPct || 0) + 5; }
  return o;
}
function build() {
  const nodes = [{ id: "origin", x: 0, y: 0, branch: null, ring: 0, lane: "o", name: "Origin · Dantian", fx: { flat: {}, pct: {} }, links: [], free: true }], by = { origin: nodes[0] };
  const link = (a, b) => { if (!a || !b || a === b) return; a.links.includes(b.id) || a.links.push(b.id); b.links.includes(a.id) || b.links.push(a.id); };
  const add = (n) => { nodes.push(n); by[n.id] = n; return n; };
  BRANCHES.forEach((b) => {
    const th = (b.ang * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
    for (let k = 1; k <= RINGS; k++) {
      const R = 96 + k * 74, sp = 40 + k * 9, mk = (lane, off) => ({ id: `${b.id}-${lane}${k}`, x: Math.round(ux * R + vx * off), y: Math.round(uy * R + vy * off), branch: b.id, ring: k, lane });
      const keyed = k === 5 || k === 10, s = add({ ...mk("s", 0), key: keyed, name: keyed ? b.key[k / 5 - 1] : `${RING_NAME[k - 1]} ${b.base[0]}`, fx: keyed ? keyFx(b, k) : mainFx(b, k, k), links: [] });
      link(s, by[k === 1 ? "origin" : `${b.id}-s${k - 1}`]);
      if (k >= 2) for (const lane of ["l", "r"]) {
        const off = (lane === "l" ? -1 : 1) * sp, n = add({ ...mk(lane, off), name: `${RING_NAME[k - 1]} ${b.base[LANE_CHAR[lane]]}`, fx: subFx(b, lane, k), links: [] });
        link(n, k === 2 ? by[`${b.id}-s1`] : by[`${b.id}-${lane}${k - 1}`]); link(n, s);
      }
    }
  });
  // cross-links between neighbouring branches (right lane of one <-> left lane of the next) make it a web rather than six separate trees
  BRANCHES.forEach((b, i) => { const nb = BRANCHES[(i + 1) % BRANCHES.length]; for (const k of [3, 6, 9]) link(by[`${b.id}-r${k}`], by[`${nb.id}-l${k}`]); });
  return { nodes, by };
}
const WEB = build();
export const NODES = WEB.nodes, NODE = WEB.by;
export const branchOf = (id) => BRANCHES.find((b) => b.id === id);

/** readable text of what a node gives */
export function describeFx(fx) {
  const out = []; for (const [k, v] of Object.entries(fx.flat || {})) if (v) out.push(`+${Math.round(v * 100) / 100}${STAT[k][1] === "%" ? "%" : STAT[k][1] === "%/s" ? "%/s" : ""} ${STAT[k][0]}`);
  for (const [k, v] of Object.entries(fx.pct || {})) if (v) out.push(`${v > 0 ? "+" : ""}${Math.round(v * 100) / 100}% ${STAT[k][0]}`); return out;
}

// ---------------------------------------------------------------- saved state (inside flags.hero)
export function heroRec(eco) { const f = eco.state.flags; const h = (f.hero ||= { lv: 1, exp: 0, hp: null, kills: 0, species: null }); h.nodes ||= []; h.bonusPts ||= 0; h.spentRespec ||= 0; return h; }
const levelOf = (eco) => eco.state.flags?.hero?.lv || 1;
/** { total, spent, free } stat points.  total = level points + bonus points from class / specialist weapons / cultivation tier ... */
export function pointsOf(eco) { const h = heroRec(eco), total = levelPoints(h.lv) + (h.bonusPts || 0), spent = h.nodes.length * NODE_COST; return { total, spent, free: Math.max(0, total - spent), nodes: h.nodes.length }; }
export const isActive = (eco, id) => id === "origin" || heroRec(eco).nodes.includes(id);
/** a node can be activated when it is next to an active one and there are enough free points */
export function canActivate(eco, id) {
  const n = NODE[id]; if (!n || id === "origin") return { ok: false, reason: "invalid" }; if (isActive(eco, id)) return { ok: false, reason: "active" };
  if (!n.links.some((l) => isActive(eco, l))) return { ok: false, reason: "locked" };
  if (pointsOf(eco).free < NODE_COST) return { ok: false, reason: "points" }; return { ok: true };
}
export function activate(eco, id) { const c = canActivate(eco, id); if (!c.ok) return c; heroRec(eco).nodes.push(id); eco.changed?.(); return { ok: true }; }
/** a node can be refunded when it is a "leaf": nothing active depends on it for its connection to the Origin */
export function canRefund(eco, id) {
  if (id === "origin" || !isActive(eco, id)) return false; const act = new Set(["origin", ...heroRec(eco).nodes]); act.delete(id);
  const seen = new Set(["origin"]), q = ["origin"]; while (q.length) { const n = NODE[q.pop()]; for (const l of n.links) if (act.has(l) && !seen.has(l)) { seen.add(l); q.push(l); } } return seen.size === act.size;
}
export const respecCost = (eco) => Math.round(heroRec(eco).nodes.length * 0.6 * 100) / 100;   // xc, so wandering back and forth is possible but not free
export function refund(eco, id, free = false) {
  if (!canRefund(eco, id)) return { ok: false, reason: "needed" }; const cost = free ? 0 : 0.6; if (!free && eco.wallet() + 1e-9 < cost) return { ok: false, reason: "no_funds" };
  if (cost) eco.state.wallet_xc = Math.round((eco.state.wallet_xc - cost) * 100) / 100; const h = heroRec(eco); h.nodes = h.nodes.filter((x) => x !== id); eco.changed?.(); return { ok: true, cost };
}
export function resetNodes(eco) {
  const h = heroRec(eco), cost = respecCost(eco); if (!h.nodes.length) return { ok: false, reason: "empty" }; if (eco.wallet() + 1e-9 < cost) return { ok: false, reason: "no_funds", cost };
  eco.state.wallet_xc = Math.round((eco.state.wallet_xc - cost) * 100) / 100; h.nodes = []; eco.changed?.(); return { ok: true, cost };
}

// ---------------------------------------------------------------- stat sources
/** every source returns { flat: {stat: n}, pct: {stat: %} }.  Only the node web is implemented now; the others are the hooks for the coming systems. */
export const SOURCES = {
  nodes(eco) {
    const o = { flat: {}, pct: {} }; for (const id of heroRec(eco).nodes) { const n = NODE[id]; if (!n) continue; for (const [k, v] of Object.entries(n.fx.flat || {})) o.flat[k] = (o.flat[k] || 0) + v; for (const [k, v] of Object.entries(n.fx.pct || {})) o.pct[k] = (o.pct[k] || 0) + v; } return o;
  },
  equipment: (eco) => eco.state.flags?.hero?.equipment || { flat: {}, pct: {} },       // weapons / armour / accessories (not implemented yet)
  class: (eco) => eco.state.flags?.hero?.classMods || { flat: {}, pct: {} },            // class bonuses
  specialist: (eco) => eco.state.flags?.hero?.weaponMods || { flat: {}, pct: {} },      // specialist weapon attributes
  cultivation: (eco) => eco.state.flags?.hero?.cultivationMods || { flat: {}, pct: {} },// % bonuses AND penalties on specific attributes, e.g. { pct: { str: 20, agi: -10 } }
  pets: (eco) => eco.state.flags?.hero?.petMods || { flat: {}, pct: {} },
};
export const BASE = { maxHp: 50, atk: 6, def: 0, speed: 0.95 };
/** combine everything -> the character's final attributes.  buffs = { atk, def } temporary multipliers from skills (optional) */
export function statsOf(eco, buffs = {}) {
  const flat = {}, pct = {}; for (const f of Object.values(SOURCES)) { const s = f(eco); for (const [k, v] of Object.entries(s.flat || {})) flat[k] = (flat[k] || 0) + v; for (const [k, v] of Object.entries(s.pct || {})) pct[k] = (pct[k] || 0) + v; }
  const A = {}; for (const a of ATTRS) A[a] = Math.max(0, (flat[a] || 0) * (1 + (pct[a] || 0) / 100));        // cultivation etc. can scale an attribute up or down
  const f = (k) => flat[k] || 0, p = (k) => 1 + (pct[k] || 0) / 100;
  const maxHp = Math.round((BASE.maxHp + A.vit * 14 + A.str * 2) * p("maxHp")), atk = (BASE.atk + A.str * 2.2 + A.dex * 0.6) * p("atk") * (1 + (buffs.atk || 0));
  const def = (BASE.def + A.vit * 0.5 + A.agi * 0.25) * p("def") * (1 + (buffs.def || 0)), haste = A.agi * 0.8 + f("haste");
  return {
    attrs: A, maxHp, atk, def, speed: Math.max(0.32, BASE.speed / (1 + haste / 100)),
    crit: Math.min(75, 5 + A.dex * 0.18 + f("crit")), critDmg: 150 + f("critDmg"), cdr: Math.min(70, A.spi * 0.2 + f("cdr")), evade: Math.min(45, A.agi * 0.12 + f("evade")),
    skillPct: A.spi * 0.6 + f("skillPct"), regen: f("regen"), expPct: f("expPct"), dropPct: f("dropPct"),
  };
}
export const powerOf = (st) => Math.round(st.atk * 12 + st.maxHp * 0.35 + st.def * 10 + st.crit * 4 + st.critDmg * 0.5 + st.skillPct * 2);
