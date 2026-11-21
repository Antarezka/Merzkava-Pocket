import { cultivationMods, cult, realmOf } from "./realms.js";
import { PATHS } from "./meridian.js";
import { SKILL } from "./skills.js";
// Character development (architecture v6): Level -> Stat Points -> Meridian Web -> Final Stats.
//   * 17 Base Stats, all starting at 9: six Primary Attributes (STR DEX AGI VIT END LCK) + eleven modifiers (chant / recovery / cooldown / crit rate / crit damage /
//     consistent damage / consistent defense / Qi consumption / Qi consumption reduction / HP regen / Qi regen). HP, HP Cap, Qi and Qi Cap are resource pools derived from them.
//   * Stat Points: +3 per level (1,995 at Lv 666) + independent extra allowances (Class 216, Specialist Weapons 216, Guanghuan Realm 210 = 642). A node costs 6.
//   * Meridian Web: six named paths x 133 nodes, one shared network. A node can be activated only when it touches an active node (the Origin is always active);
//     only ACTIVE nodes add their stat. The Node System (cultivation) is NOT a point source; it is the realm / breakthrough interface.
//   * Final stat = (9 + flat bonuses) x (1 + % modifiers); derived effects grow from the points above 9 (formulas in statsOf; every curve is mine, the document left them open).
// Pure data + maths: no DOM, no engine imports.
export const LEVEL_CAP = 666, POINTS_PER_LEVEL = 3, NODE_COST = 6;
export const levelPoints = (lv) => POINTS_PER_LEVEL * Math.max(0, Math.min(LEVEL_CAP, lv) - 1);          // 1995 at the cap
export const TOTAL_LEVEL_POINTS = levelPoints(LEVEL_CAP);
export const EXTRA_BUDGET = { class: 216, weapon: 216, realm: 210 };                                      // provisional allowances from the document (642 combined)
export const REALM_POINTS = [24, 24, 24, 23, 23, 23, 23, 23, 23];                                         // 210, awarded on entering each Guanghuan Realm

// ---------------------------------------------------------------- the 17 Base Stats
export const ATTRS = ["str", "dex", "agi", "vit", "end", "lck"];
export const MODS = ["ctr", "srr", "cdr", "crt", "cdm", "cod", "cdf", "qco", "qcr", "hpr", "qir"];
export const STAT_IDS = [...ATTRS, ...MODS];
export const STAT = {
  str: ["Strength", "", "ATK +2.2 · Max HP +1.5"], dex: ["Dexterity", "", "ATK +0.6 · Skill damage +0.35% · Crit rate +0.05%"], agi: ["Agility", "", "Swing speed +0.8% · Evade +0.12% · DEF +0.1"],
  vit: ["Vitality", "", "Max HP +14 · DEF +0.15 · Qi cap +2"], end: ["Endurance", "", "Max HP +3 · DEF +0.5 · Qi cap +6"], lck: ["Luck", "", "Crit rate +0.15% · Deadly-hit chance · Evade +0.05%"],
  ctr: ["Chant Time Reduction", "", "Chant time −0.45% per point (max 70%). Never touches cooldowns"], srr: ["Skill Recovery Reduction", "", "Recovery after a skill −0.5% per point (max 70%): faster chaining"],
  cdr: ["Cooldown Reduction", "", "Skill cooldowns −0.4% per point (max 60%)"], crt: ["Critical Rate", "", "Crit chance +0.2% per point"], cdm: ["Critical Damage", "", "Crit damage +1.2% per point"],
  cod: ["Consistent Damage", "", "Non-crit damage +1% per point and steadier rolls"], cdf: ["Consistent Defense", "", "Flat DEF +0.8 per point"], qco: ["Qi Consumption", "", "Base Qi cost −0.6% per point (max −40%)"],
  qcr: ["Qi Consumption Reduction", "", "Qi cost paid −0.5% per point (max −50%, final cost never below 30%)"], hpr: ["HP Regeneration", "", "HP regen +0.015% of max HP per second per point"], qir: ["Qi Regeneration", "", "Qi regen +0.14 per second per point"],
  // derived / legacy keys used by other sources
  crit: ["Crit chance", "%"], critDmg: ["Crit damage", "%"], evade: ["Evade", "%"], haste: ["Swing speed", "%"], regen: ["HP regen", "%/s"], expPct: ["EXP gain", "%"], dropPct: ["Loot & book luck", "%"], skillPct: ["Skill damage", "%"],
  atk: ["ATK", "%"], maxHp: ["Max HP", "%"], def: ["DEF", "%"], qi: ["Qi cap", "%"],
};
const PCT_KEYS = new Set(["atk", "maxHp", "def", "qi"]);

// ---------------------------------------------------------------- Meridian Web (generated, deterministic): six wedges of 133 nodes around the Origin
export const BRANCHES = PATHS, PATH = Object.fromEntries(PATHS.map((p) => [p.id, p]));
export const PATH_NODES = 133;
export const MAG = { core: 1.0, support: 1.6, low: 2.2, weak: 3.0 };   // Base Stat points per node (rarer nodes are worth more); the last node of every Core run is a "Seal" worth double
const S = 46, R0 = 84, DR = 40, WEDGE = 0.9;
function build() {
  const nodes = [{ id: "origin", x: 0, y: 0, path: null, branch: null, ring: 0, name: "Origin · Dantian", fx: { flat: {}, pct: {} }, links: [], free: true }], by = { origin: nodes[0] }, rows = {};
  const link = (a, b) => { if (!a || !b || a === b) return; a.links.includes(b.id) || a.links.push(b.id); b.links.includes(a.id) || b.links.push(a.id); };
  PATHS.forEach((P, pi) => {
    const th = (-90 + 60 * pi) * Math.PI / 180, seq = []; for (const [st, cnt, tier] of P.runs) for (let i = 0; i < cnt; i++) seq.push({ st, tier, i, last: i === cnt - 1, cnt });
    const rr = []; let rem = PATH_NODES, k = 1; while (rem > 0) { const R = R0 + (k - 1) * DR, full = Math.max(2, Math.floor(WEDGE * R / S) + 1), c = Math.min(full, rem); rr.push({ R, c }); rem -= c; k++; }
    let n = 0; rows[P.id] = [];
    rr.forEach(({ R, c }, ri) => { const row = [], W = Math.min(WEDGE, (c - 1) * S / R);
      for (let j = 0; j < c; j++) { const a = th + (c === 1 ? 0 : (j / (c - 1) - 0.5) * W), q = seq[n++], seal = q.tier === "core" && q.last, v = MAG[q.tier] * (seal ? 2 : 1), id = `${P.id}-${n}`;
        const nd = { id, n, path: P.id, branch: P.id, pi, ring: ri + 1, x: Math.round(Math.cos(a) * R), y: Math.round(Math.sin(a) * R), stat: q.st, tier: q.tier, key: seal, name: seal ? `${STAT[q.st][0]} Seal` : `${STAT[q.st][0]} ${String(q.i + 1).padStart(2, "0")}`, fx: { flat: { [q.st]: v }, pct: {} }, links: [], j, c };
        nodes.push(nd); by[id] = nd; row.push(nd); if (j) link(row[j - 1], nd); }
      if (ri === 0) row.forEach((nd) => link(nd, by.origin)); else { const prev = rows[P.id][ri - 1]; row.forEach((nd, j) => { const f = nd.c === 1 ? 0.5 : j / (nd.c - 1), pos = f * (prev.length - 1); link(nd, prev[Math.floor(pos)]); link(nd, prev[Math.ceil(pos)]); }); }
      rows[P.id].push(row); });
  });
  PATHS.forEach((P, pi) => { const Q = PATHS[(pi + 1) % 6]; for (const row of rows[P.id].slice(2)) { const a = row[row.length - 1]; let best = null, bd = S * 1.5; for (const r2 of rows[Q.id].slice(2)) { const b = r2[0], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < bd) { bd = d; best = b; } } if (best) link(a, best); } });   // seam links: one web, not six trees
  return { nodes, by };
}
const WEB = build();
export const NODES = WEB.nodes, NODE = WEB.by;
export const branchOf = (id) => PATH[id] || null;
export const WEB_RADIUS = Math.max(...NODES.map((n) => Math.hypot(n.x, n.y)));

/** readable text of what a node gives */
export function describeFx(fx) {
  const out = []; for (const [k, v] of Object.entries(fx.flat || {})) if (v) out.push(`+${Math.round(v * 100) / 100}${STAT[k]?.[1] === "%" ? "%" : STAT[k]?.[1] === "%/s" ? "%/s" : ""} ${STAT[k]?.[0] || k}`);
  for (const [k, v] of Object.entries(fx.pct || {})) if (v) out.push(`${v > 0 ? "+" : ""}${Math.round(v * 100) / 100}% ${STAT[k]?.[0] || k}`); return out;
}

// ---------------------------------------------------------------- saved state (inside flags.hero)
export function heroRec(eco) { const f = eco.state.flags; const h = (f.hero ||= { lv: 1, exp: 0, hp: null, kills: 0, species: null }); h.nodes ||= []; if (h.nodes.some((id) => !NODE[id])) h.nodes = h.nodes.filter((id) => NODE[id]); h.bonusPts ||= 0; h.spentRespec ||= 0; return h; }
/** extra Stat Point allowances (provisional budget 216 + 216 + 210): Class mastery (3 per Class Skill Tree skill, 15 per Ultimate), Specialist Weapons (hook: hero.weaponPts), Guanghuan Realm (on entering a realm) */
export function extraPoints(eco) {
  const h = heroRec(eco), owned = eco.state.flags?.skills?.owned || {}; let cp = 0; for (const id of Object.keys(owned)) { const s = SKILL[id]; if (s && s.cls !== "basic") cp += s.ult ? 15 : 3; }
  const n = realmOf(h.lv).n, awake = h.lv > 1; let rp = 0; for (let i = 0; i < n; i++) if (i || awake) rp += REALM_POINTS[i];   // Guanghuan Initiate (and its points) opens with Slot 1 at Lv 2
  return { class: Math.min(EXTRA_BUDGET.class, cp), weapon: Math.min(EXTRA_BUDGET.weapon, h.weaponPts || 0), realm: Math.min(EXTRA_BUDGET.realm, rp) };
}
/** { total, spent, free, nodes, src } stat points */
export function pointsOf(eco) { const h = heroRec(eco), x = extraPoints(eco), lvl = levelPoints(h.lv), total = lvl + x.class + x.weapon + x.realm + (h.bonusPts || 0), spent = h.nodes.length * NODE_COST; return { total, spent, free: Math.max(0, total - spent), nodes: h.nodes.length, src: { level: lvl, ...x } }; }
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
/** every source returns { flat: {stat: n}, pct: {stat: %} }.  Nodes and cultivation (Guanghuan Realm / Origin / Rings) are live; the rest are hooks for the coming systems. */
export const SOURCES = {
  nodes(eco) {
    const o = { flat: {}, pct: {} }; for (const id of heroRec(eco).nodes) { const n = NODE[id]; if (!n) continue; for (const [k, v] of Object.entries(n.fx.flat || {})) o.flat[k] = (o.flat[k] || 0) + v; for (const [k, v] of Object.entries(n.fx.pct || {})) o.pct[k] = (o.pct[k] || 0) + v; } return o;
  },
  equipment: (eco) => eco.state.flags?.hero?.equipment || { flat: {}, pct: {} },       // weapons / armour / accessories (not implemented yet)
  class: (eco) => eco.state.flags?.hero?.classMods || { flat: {}, pct: {} },            // direct class bonuses (the class Stat Point allowance is counted in pointsOf)
  specialist: (eco) => eco.state.flags?.hero?.weaponMods || { flat: {}, pct: {} },      // Specialist Weapon bonuses
  realm: (eco) => cultivationMods(eco),                                                 // Guanghuan Realm stages / breakthroughs, Origin, Guanghuan, hunger
  pets: (eco) => eco.state.flags?.hero?.petMods || { flat: {}, pct: {} },
};
export const BASE_STAT = 9;   // every Base Stat starts at 9 (Strength 9 + a +3 node = 12)
export const BASE = { maxHp: 50, atk: 6, def: 0, speed: 0.95, qi: 80, qiRegen: 1.2 };
/** combine everything -> final Base Stats, then the derived combat numbers.  buffs = { atk, def } temporary multipliers from skills (optional) */
export function statsOf(eco, buffs = {}) {
  const flat = {}, pct = {}; for (const f of Object.values(SOURCES)) { const s = f(eco); for (const [k, v] of Object.entries(s.flat || {})) flat[k] = (flat[k] || 0) + v; for (const [k, v] of Object.entries(s.pct || {})) pct[k] = (pct[k] || 0) + v; }
  const A = {}, X = {}; for (const a of STAT_IDS) { A[a] = Math.max(0, (BASE_STAT + (flat[a] || 0)) * (1 + (pct[a] || 0) / 100)); X[a] = A[a] - BASE_STAT; }   // % sources can scale a stat up or down; effects grow from the points above 9
  const f = (k) => flat[k] || 0, p = (k) => 1 + (pct[k] || 0) / 100, cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const maxHp = Math.round((BASE.maxHp + X.vit * 14 + X.end * 3 + X.str * 1.5) * p("maxHp")), atk = (BASE.atk + X.str * 2.2 + X.dex * 0.6 + X.lck * 0.2) * p("atk") * (1 + (buffs.atk || 0));
  const def = (BASE.def + X.end * 0.5 + X.cdf * 0.8 + X.vit * 0.15 + X.agi * 0.1) * p("def") * (1 + (buffs.def || 0)), haste = X.agi * 0.8 + f("haste");
  return {
    attrs: A, maxHp, atk, def, speed: Math.max(0.32, BASE.speed / (1 + haste / 100)),
    crit: Math.min(75, 5 + X.crt * 0.2 + X.lck * 0.15 + X.dex * 0.05 + f("crit")), critDmg: 150 + X.cdm * 1.2 + f("critDmg"), deadly: cl(4 + X.lck * 0.3, 0, 35),   // deadly = % of crits that become Deadly hits
    consDmg: cl(X.cod, 0, 150), chantRed: cl(X.ctr * 0.45, 0, 70), recovRed: cl(X.srr * 0.5, 0, 70), cdRed: cl(X.cdr * 0.4, 0, 60), evade: Math.min(45, X.agi * 0.12 + X.lck * 0.05 + f("evade")),
    skillPct: (X.str + X.dex) * 0.35 + X.cod * 0.5 + f("skillPct"), regen: X.hpr * 0.015 + f("regen"), expPct: f("expPct"), dropPct: f("dropPct"),
    qiCap: Math.round((BASE.qi + X.end * 6 + X.vit * 2) * p("qi")), qiRegen: BASE.qiRegen + X.qir * 0.14, qiCostMul: Math.max(0.3, (1 - Math.min(0.4, X.qco * 0.006)) * (1 - Math.min(0.5, X.qcr * 0.005))),
  };
}
export const powerOf = (st) => Math.round(st.atk * 12 + st.maxHp * 0.35 + st.def * 10 + st.crit * 4 + st.critDmg * 0.5 + st.skillPct * 2);
