// Cultivation rules (spec v4, revised by v9): nine Spirit Realms with hard level gates, Martial Soul Awakening, Spirit Rings, Satiety and ring absorption.
// Everything the spec marks "TBD" is decided here (formulas / curves are mine - tune the constants at the top of each block). Pure logic, no DOM.
// v9: Level 1 is pre-awakening and outside the nine Spirit Realms.  Awakening only OPENS Ring Slot 1 (empty); the hero stays Lv 1 until Ring 1 is absorbed (1 in-game day),
//   which opens Spirit Initiate at Lv 2.  Slots 2-9 open at the previous realm cap, and only if the preceding slot is occupied; absorbing that ring = the breakthrough.
// State lives in eco.state.flags.cult:
//   { passed, soul, proof, rings[9] (index = slot - 1), pending, absorb, sat, autoEat, pity }
const ATTR_IDS = ["str", "dex", "agi", "vit", "end", "lck"];
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- realms (level gates)
export const REALMS = [["Spirit Initiate", 2, 74], ["Spirit Adept", 75, 148], ["Spirit Elder", 149, 222], ["Spirit Monarch", 223, 296], ["Spirit King", 297, 370], ["Spirit Ancestor", 371, 444], ["Spirit Emperor", 445, 518], ["Spirit Sovereign", 519, 592], ["Spirit Primordial", 593, 666]]
  .map(([name, lo, hi], i) => ({ n: i + 1, name, lo, hi }));
export const STAGES = ["Early", "Middle", "Late", "Peak"], STAGE_AT = [0, 0.22, 0.5, 0.78];   // stages are not even: Early 22%, Middle 28%, Late 28%, Peak 22% of the realm's levels
export const realmOf = (lv) => REALMS.find((r) => lv <= r.hi) || REALMS[8];
export const stageOf = (lv) => { const r = realmOf(lv), f = (lv - r.lo) / (r.hi - r.lo + 1); let s = 0; STAGE_AT.forEach((a, i) => { if (f >= a) s = i; }); return s; };
export const stageRange = (n, s) => { const r = REALMS[n - 1], len = r.hi - r.lo + 1; return [r.lo + Math.ceil(len * STAGE_AT[s]), s === 3 ? r.hi : r.lo + Math.ceil(len * STAGE_AT[s + 1]) - 1]; };
export const title = (lv) => lv <= 1 ? "Mortal · Lv 1" : `${realmOf(lv).name} · ${STAGES[stageOf(lv)]}`;

export function cult(eco) {
  const f = eco.state.flags, c = (f.cult ||= {}); c.passed ||= 0; c.rings ||= Array(9).fill(null); c.pending ??= null; c.absorb ??= null; c.soul ??= null; c.proof ??= false; if (c.sat == null) c.sat = 100; if (c.autoEat == null) c.autoEat = true; c.lastSat ??= null; return c;
}
const heroLv = (eco) => eco.state.flags?.hero?.lv || 1;
/** realms already broken through (a hero that is simply above a realm - old saves, dev tools - never gets gated behind it) */
export const passedOf = (eco) => Math.max(cult(eco).passed, realmOf(heroLv(eco)).n - 1);
/** why EXP can't turn into levels right now: "awaken" (Lv 1, not awakened) | "ring1" (Lv 1, awakened - absorb Ring 1 to open Spirit Initiate) | "break" (realm cap reached) | null.  Banked EXP is kept, never lost. */
export function gateOf(eco) {
  const lv = heroLv(eco), c = cult(eco); if (lv <= 1) return c.rings[0] ? null : c.soul ? "ring1" : "awaken";
  const r = realmOf(lv); if (lv >= r.hi && r.n < 9 && passedOf(eco) < r.n) return "break"; return null;
}
/** the Ring slot (1-9) a ring found right now would be absorbed into; 0 = no slot is open */
export const targetSlot = (eco) => { const g = gateOf(eco); return g === "ring1" ? 1 : g === "break" ? realmOf(heroLv(eco)).n + 1 : 0; };
/** state of each of the nine slots: "off" (not awakened) | "locked" | "open" (available, empty) | "full" */
export function slotStates(eco) {
  const c = cult(eco), lv = heroLv(eco), t = targetSlot(eco); return Array.from({ length: 9 }, (_, i) => c.rings[i] ? "full" : lv <= 1 && !c.soul ? "off" : i + 1 === t && (i === 0 || c.rings[i - 1]) ? "open" : "locked");
}

// ---------------------------------------------------------------- currency: 1 Xuan Gold = 100 Xuan Silver, and 1 xc (the game's coin) = 1 Xuan Silver
export const SILVER_PER_GOLD = 100;
export const ROUTES = [{ id: "independent", name: "Independent Awakening", silver: 3 * SILVER_PER_GOLD + 76, blurb: "Full-cost route: 3 Xuan Gold 76 Xuan Silver.", public: false },
  { id: "public", name: "Imperial Public Subsidized Awakening", silver: 10, blurb: "Subsidized route: 10 Xuan Silver.", public: true }];

// ---------------------------------------------------------------- Martial Soul
export const RARITY = [{ id: "common", name: "Common", col: "#c9c3d6", to: 30 }, { id: "uncommon", name: "Uncommon", col: "#7fe0a0", to: 57 }, { id: "rare", name: "Rare", col: "#6fb4ff", to: 77 },
  { id: "epic", name: "Epic", col: "#c07cff", to: 89 }, { id: "legendary", name: "Legendary", col: "#ffc247", to: 97 }, { id: "myth", name: "Myth", col: "#ff6a5a", to: 100 }];
export const rarityOfRoll = (n) => RARITY.findIndex((r) => n <= r.to);
export const ELEMENTS = [{ id: "blade", name: "Blade", attr: "str", col: "#cfd8e8" }, { id: "flame", name: "Flame", attr: "dex", col: "#ff7a45" }, { id: "frost", name: "Frost", attr: "end", col: "#8fdcff" }, { id: "thunder", name: "Thunder", attr: "agi", col: "#ffe14a" },
  { id: "wind", name: "Wind", attr: "lck", col: "#9be8c8" }, { id: "jade", name: "Jade", attr: "vit", col: "#4fd69a" }, { id: "shadow", name: "Shadow", attr: "lck", col: "#9a7cff" }, { id: "radiant", name: "Radiant", attr: "end", col: "#ffd98a" }];
export const FORMS = ["Tiger", "Crane", "Serpent", "Dragon", "Lotus", "Phoenix", "Tortoise", "Fox"];
export const QUALITY_GRADES = [[20, "Flawed"], [40, "Plain"], [60, "Sound"], [80, "Fine"], [95, "Superb"], [101, "Flawless"]];
export const gradeOf = (q) => QUALITY_GRADES.find(([m]) => q < m)[1];
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
/** first roll (1-100) + separate inherent quality (1-100, bell-shaped).  Payment route never changes the odds. */
export function rollSoul(rnd = Math.random) {
  const roll = 1 + Math.floor(rnd() * 100), el = pick(ELEMENTS, rnd), form = pick(FORMS, rnd), quality = Math.max(1, Math.min(100, Math.round(((1 + rnd() * 99) + (1 + rnd() * 99)) / 2)));
  return { roll, rarity: rarityOfRoll(roll), element: el.id, form, quality, mutated: false, name: `${el.name} ${form} Soul` };
}
/** Mutation (decided here): 1-10 mutates up one rarity; 11-40 backlash drops one rarity; 41-100 nothing changes.  Free to try, once. */
export function mutateSoul(soul, rnd = Math.random) {
  const m = 1 + Math.floor(rnd() * 100); soul.mutRoll = m; soul.tried = true;
  if (m <= 10) { if (soul.rarity < 5) soul.rarity++; else soul.quality = Math.min(100, soul.quality + 15); soul.mutated = true; return "up"; }
  if (m <= 40) { if (soul.rarity > 0) { soul.rarity--; return "down"; } return "none"; } return "none";
}
export const elementOf = (soul) => ELEMENTS.find((e) => e.id === soul?.element) || ELEMENTS[0];
export function awaken(eco, routeId, soul) {   // pays, records the soul, issues the Proof Token
  const c = cult(eco), rt = ROUTES.find((r) => r.id === routeId); if (c.soul) return { ok: false, reason: "done" };
  if (rt) { if (eco.wallet() + 1e-9 < rt.silver) return { ok: false, reason: "no_funds" }; eco.state.wallet_xc = r2(eco.state.wallet_xc - rt.silver); eco.ledger?.("service", -rt.silver, rt.name); }
  c.soul = soul; c.proof = true; c.route = routeId; eco.changed?.(); return { ok: true };
}

// ---------------------------------------------------------------- Satiety (only items of category "food" count)
export const SAT = { dayDrain: 50, relief: 0.88, upkeepMin: 240, low: 25 };   // 100 -> 0 in two sim-days at first; every breakthrough slows it by x0.88
export const satOf = (item) => 10 + 7 * (item.quality_tier || 1);
export const foodList = (eco) => eco.bagList().filter((x) => x.item.category === "food").sort((a, b) => satOf(a.item) - satOf(b.item));
export const foodCount = (eco) => Math.floor(foodList(eco).reduce((s, x) => s + x.qty, 0));
export const drainPerMin = (eco) => (SAT.dayDrain / 1440) * Math.pow(SAT.relief, passedOf(eco));
export function eat(eco, itemId) {
  const it = eco.catalog.itemById.get(itemId); if (!it || it.category !== "food") return { ok: false, reason: "not_food" }; const c = cult(eco); if (c.sat >= 99.5) return { ok: false, reason: "full" };
  const r = eco.removeItem(itemId, 1); if (!r.ok) return r; c.sat = Math.min(100, c.sat + satOf(it)); eco.changed?.(); return { ok: true, name: it.name, sat: c.sat };
}
export const isStarving = (eco) => cult(eco).sat <= 0;

// ---------------------------------------------------------------- Spirit Beasts & Spirit Rings (v9 reference tables)
// Ring colour by age (years).  Beast Age Grade and Ring colour are SEPARATE classifications: nothing here derives one from the other.
export const RING_TIERS = [
  { id: "white", name: "White", years: [10, 99], col: "#eceaf4", pct: 2, flat: 1 }, { id: "yellow", name: "Yellow", years: [100, 999], col: "#ffd84a", pct: 3.4, flat: 1.6 },
  { id: "blue", name: "Blue", years: [1000, 9999], col: "#4aa3ff", pct: 5.2, flat: 2.4 }, { id: "black", name: "Black", years: [10000, 49999], col: "#5f5f80", pct: 7.6, flat: 3.4 },
  { id: "red", name: "Red", years: [50000, 99999], col: "#ff4a4a", pct: 10.5, flat: 4.6 }, { id: "orange", name: "Orange", years: [100000, 499999], col: "#ff9a3a", pct: 14, flat: 6 },
  { id: "maroon", name: "Maroon", years: [500000, 999999], col: "#b0304f", pct: 18, flat: 7.6 }, { id: "gold", name: "Gold", years: [1000000, 1999999], col: "#f2c230", pct: 22.5, flat: 9.4 },
  { id: "purple", name: "Purple", years: [2000000, 3999999], col: "#b46cff", pct: 27.5, flat: 11.4 }, { id: "pink", name: "Pink", years: [4000000, 6999999], col: "#ff7ac8", pct: 33, flat: 13.6 },
  { id: "vienna", name: "Dark Vienna", years: [7000000, 15000000], col: "#16b8a6", pct: 40, flat: 16 }];
export const BEAST_CATS = { ordinary: "Ordinary Beast", spirit: "Spirit Beast", supreme: "Supreme Beast", demonic: "Demonic Beast", heavenly: "Heavenly Beast" };
export const AGE_GRADES = [[10, 150], [151, 999], [1000, 4999], [5000, 9999], [10000, 49999], [50000, 99999], [100000, 199999], [200000, 499999], [500000, 2000000]];   // Grade 9 is "500,000+"
export const BEAST_TRAITS = [["rare", "Rare / Unique", 0.06], ["mutated", "Mutated", 0.04], ["corrupted", "Corrupted", 0.03]];     // traits - never extra categories
const KIND = { beast: ["Fang", "cdm", "Critical Damage"], spirit: ["Veil", "ctr", "Chant Time Reduction"], golem: ["Bulwark", "hpr", "HP Regeneration"], critter: ["Dart", "srr", "Skill Recovery Reduction"], slime: ["Bloom", "qir", "Qi Regeneration"] };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
/** which monsters can carry a Ring at all: every sub boss / boss, plus beast- and spirit-kind mobs */
export function ringEligible(sp, art) { return sp.tier !== "mob" || art?.[sp.art]?.kind === "beast" || art?.[sp.art]?.kind === "spirit"; }
export const isBeast = ringEligible;
/** classification of one killed monster (decided here): category by tier, age grade by the monster's own level, traits are rare extras */
export function beastOf(sp, lv, rnd = Math.random) {
  const x = rnd(), cat = sp.tier === "boss" ? (x < 0.3 ? "supreme" : x < 0.65 ? "demonic" : "heavenly") : sp.tier === "sub" ? (x < 0.35 ? "spirit" : x < 0.8 ? "supreme" : "demonic") : (x < 0.62 ? "ordinary" : "spirit");
  const n = realmOf(lv).n, base = n - 1 + (sp.tier === "boss" ? 2 : sp.tier === "sub" ? 1 : 0) + { ordinary: -1, spirit: 0, supreme: 1, demonic: 1, heavenly: 2 }[cat];
  const grade = clampN(1 + Math.round(base * 0.9 + (rnd() - 0.5) * 1.4), 1, 9), [lo, hi] = AGE_GRADES[grade - 1], age = Math.round(lo * Math.pow(hi / lo, rnd()));
  return { cat, grade, age, traits: BEAST_TRAITS.filter((t) => rnd() < t[2]).map((t) => t[0]) };
}
/** only Spirit Beasts and above carry a Ring.  Per-kill odds by category, x3 for sub bosses, x4 for bosses; a pity counter slowly raises it, and the first Ring is made easier */
export function ringDropChance(sp, beast, luck = 0, pity = 0, slot = 2) {
  const base = { ordinary: 0, spirit: 0.03, supreme: 0.09, demonic: 0.12, heavenly: 0.16 }[beast.cat] * (sp.tier === "boss" ? 4 : sp.tier === "sub" ? 3 : 1);
  return Math.min(0.95, base * (1 + luck / 200) * (1 + Math.min(5, pity * 0.06)) * (slot === 1 ? 2.5 : 1));
}
/** the ring's colour band follows the slot it is for (slot 1 = White/Yellow ... slot 9 = Dark Vienna) with a little luck either way; its age is rolled inside that band */
const BAND0 = [0, 1, 3, 4, 5, 6, 8, 9, 10];
export function rollRing(eco, sp, art, beast, slot, rnd = Math.random) {
  const lv = heroLv(eco); beast ||= beastOf(sp, lv, rnd); slot ||= targetSlot(eco) || realmOf(lv).n + 1; slot = clampN(slot, 1, 9); const r = rnd();
  let band = BAND0[slot - 1] + (r < 0.2 ? -1 : r > 0.8 ? 1 : 0); if (beast.traits.includes("mutated") && rnd() < 0.25) band++; band = clampN(band, 0, slot === 1 ? 1 : 10);
  const tier = RING_TIERS[band], [lo, hi] = tier.years, age = Math.round(lo * Math.pow(hi / lo, rnd()));
  let quality = ((1 + rnd() * 99) + (1 + rnd() * 99)) / 2; if (beast.traits.includes("rare")) quality += 15; if (beast.traits.includes("mutated")) quality += 8; if (beast.traits.includes("corrupted")) quality -= 10; quality = clampN(Math.round(quality), 1, 100);
  return { id: "r" + Date.now().toString(36) + Math.floor(rnd() * 1e4).toString(36), slot, beast: sp.id, beastName: sp.name, kind: art?.[sp.art]?.kind || "beast", cat: beast.cat, grade: beast.grade, traits: beast.traits, beastAge: beast.age, tier: band, age, quality };
}
/** the ring's ability depends on the Martial Soul it merges with, not on the beast's attack: primary % on the soul's element attribute + a secondary stat from the beast's nature */
export function ringAbility(ring, soul) {
  const el = elementOf(soul), t = RING_TIERS[ring.tier], k = KIND[ring.kind] || KIND.beast, q = 0.6 + ring.quality / 100;
  return { name: `${el.name} ${k[0]}`, attr: el.attr, pct: r2(t.pct * q), stat: k[1], statName: k[2], flat: r2(t.flat * q) };   // flat = Base Stat points
}
/** called for every kill: a Ring can only drop while a slot is open for it (Level 1 awakened, or a realm cap with the preceding slot occupied) */
export function dropRing(eco, sp, art, luck, lv, rnd = Math.random) {
  const c = cult(eco), slot = targetSlot(eco); if (!slot || c.pending || c.absorb || !ringEligible(sp, art)) return null; if (slot > 1 && !c.rings[slot - 2]) return null;
  const beast = beastOf(sp, lv || heroLv(eco), rnd); if (beast.cat === "ordinary") return null; c.pity = (c.pity || 0) + 1;
  if (rnd() >= ringDropChance(sp, beast, luck, c.pity, slot)) return null; c.pity = 0; c.pending = rollRing(eco, sp, art, beast, slot, rnd); eco.changed?.(); return c.pending;
}

// ---------------------------------------------------------------- absorption (= the realm breakthrough)
export const absorbDays = (slot) => 1 + 0.5 * (slot - 1);   // Ring 1 = one full in-game day (spec), +half a day for each later slot (my curve)
export const absorbMin = (eco) => Math.round(absorbDays(targetSlot(eco) || 1) * 1440);
export const upkeepEvery = (eco) => (targetSlot(eco) === 1 ? 360 : SAT.upkeepMin);   // the very first absorption is gentler: a food item every 6 sim hours instead of 4
export const upkeepsNeeded = (eco) => Math.ceil(absorbMin(eco) / upkeepEvery(eco));
export const INTERRUPT = { odds: [0.3, 0.4, 0.22, 0.08], from: 0.12, to: 0.9, gap: 0.08 };   // 0 / 1 / 2 / 3 interruptions - never guaranteed
export function canAbsorb(eco) {
  const c = cult(eco), g = gateOf(eco); if (c.absorb) return { ok: false, reason: "busy" }; if (g !== "break" && g !== "ring1") return { ok: false, reason: g === "awaken" ? "awaken" : "no_gate" }; if (g === "break" && !c.rings[realmOf(heroLv(eco)).n - 1]) return { ok: false, reason: "prev_ring" }; if (!c.pending) return { ok: false, reason: "no_ring" };
  if (foodCount(eco) < upkeepsNeeded(eco)) return { ok: false, reason: "food", need: upkeepsNeeded(eco), have: foodCount(eco) }; return { ok: true };
}
export function startAbsorb(eco, rnd = Math.random) {
  const ok = canAbsorb(eco); if (!ok.ok) return ok; const c = cult(eco), dur = absorbMin(eco), t0 = eco.now(), every = upkeepEvery(eco), slot = targetSlot(eco);
  let x = rnd(), n = 0; for (; n < 3; n++) { x -= INTERRUPT.odds[n]; if (x <= 0) break; }
  const ev = []; for (let i = 0; i < n; i++) { const span = INTERRUPT.to - INTERRUPT.from; let f = INTERRUPT.from + span * ((i + rnd() * 0.9) / Math.max(1, n)); f = Math.min(INTERRUPT.to, f); ev.push(t0 + dur * f); }
  c.absorb = { ring: c.pending, slot, every, t0, dur, next: t0 + every, ev, evDone: 0, used: 0, stolen: [], aura: null }; c.pending = null; eco.changed?.(); return { ok: true, absorb: c.absorb };
}
/** protected from theft: tools (equipped gear); the rest is fair game.  1-3 stacks lose 25-60% each */
export function stealItems(eco, rnd = Math.random) {
  const list = eco.bagList().filter((x) => x.item.category !== "tool"), out = []; for (let i = 0; i < 1 + Math.floor(rnd() * 3) && list.length; i++) {
    const j = Math.floor(rnd() * list.length), x = list.splice(j, 1)[0], n = Math.max(1, Math.floor(x.qty * (0.25 + rnd() * 0.35))); if (eco.removeItem(x.item.item_id, n).ok) out.push({ item_id: x.item.item_id, name: x.item.name, n });
  } return out;
}
export function breakthrough(eco, ring) {   // Ring 1: opens Spirit Initiate at Lv 2.  Ring 2-9: the breakthrough - first level of the next realm.  Banked EXP continues either way
  const c = cult(eco), h = eco.state.flags.hero, r = realmOf(h.lv);
  if (h.lv <= 1) { h.lv = 2; c.rings[0] = ring; c.absorb = null; eco.changed?.(); return { lv: 2, realm: realmOf(2), slot: 1, first: true }; }
  c.passed = Math.max(c.passed, r.n); h.lv = r.hi + 1; c.rings[r.n] = ring; c.absorb = null; eco.changed?.(); return { lv: h.lv, realm: realmOf(h.lv), slot: r.n + 1, first: false };
}
export function failAbsorb(eco, why) {   // the ring is destroyed 100%; the hero is left near death (5% HP)
  const c = cult(eco), h = eco.state.flags.hero; c.absorb = null; h.hp = 1; h.nearDeath = true; eco.changed?.(); return { why };
}
/** advance the absorption to "now" (also catches up after the app was closed).  hooks: { onUpkeep(ate), onEvent(ev) -> pending, onDone(result) } */
export function tickAbsorb(eco, hooks = {}) {
  const c = cult(eco), a = c.absorb; if (!a) return null; const now = eco.now();
  while (a.next <= now && a.next < a.t0 + a.dur) {
    const f = foodList(eco)[0]; if (!f) { const ring = a.ring; failAbsorb(eco, "food"); hooks.onDone?.({ ok: false, why: "food", ring }); return { done: true }; }
    eco.removeItem(f.item.item_id, 1); a.used++; a.next += a.every || SAT.upkeepMin; hooks.onUpkeep?.(f.item); eco.changed?.();
  }
  while (a.evDone < a.ev.length && a.ev[a.evDone] <= now && !a.aura) { const t = a.ev[a.evDone]; a.aura = { t, started: false }; hooks.onEvent?.(a.aura, now - t > 8); break; }
  if (now >= a.t0 + a.dur) { const ring = a.ring, res = breakthrough(eco, ring); hooks.onDone?.({ ok: true, ring, ...res }); return { done: true }; }
  return { done: false, frac: Math.min(1, (now - a.t0) / a.dur) };
}
export function resolveAura(eco, passed) {   // called when the mini-game ends (or is ignored / expired)
  const a = cult(eco).absorb; if (!a) return []; a.evDone++; a.aura = null; let lost = []; if (!passed) { lost = stealItems(eco); a.stolen.push(...lost); } eco.changed?.(); return lost;
}
export function abortAbsorb(eco) { const c = cult(eco); if (!c.absorb) return false; c.absorb = null; eco.changed?.(); return true; }

// ---------------------------------------------------------------- what cultivation adds to the stat sources (see progression.js SOURCES.cultivation)
export function cultivationMods(eco) {
  const c = cult(eco), lv = heroLv(eco), pct = {}, flat = {}, add = (t, k, v) => { t[k] = (t[k] || 0) + v; };
  const stages = lv < 2 ? 0 : (realmOf(lv).n - 1) * 4 + stageOf(lv) + 1, passed = passedOf(eco);
  for (const a of ATTR_IDS) add(pct, a, stages * 0.4);                         // every stage node reached: +0.4% to each attribute
  add(pct, "maxHp", passed * 12); add(pct, "atk", passed * 6); add(pct, "qi", passed * 10);   // a breakthrough raises the HP / Qi caps far more than a level does
  if (c.soul) { const el = elementOf(c.soul), q = 0.75 + c.soul.quality / 200, rar = [0, 2, 4.5, 8, 13, 20][c.soul.rarity] * q; for (const a of ATTR_IDS) add(pct, a, rar); add(pct, el.attr, rar * 0.6); }
  c.rings.forEach((r) => { if (!r || !c.soul) return; const ab = ringAbility(r, c.soul); add(pct, ab.attr, ab.pct); add(flat, ab.stat, ab.flat); });
  if (c.sat <= 0) { add(pct, "atk", -15); add(pct, "maxHp", -10); }               // starving
  const legacy = eco.state.flags?.hero?.cultivationMods; if (legacy) { for (const [k, v] of Object.entries(legacy.pct || {})) add(pct, k, v); for (const [k, v] of Object.entries(legacy.flat || {})) add(flat, k, v); }
  return { flat, pct };
}
/** satiety drain + auto-eating; called from the HUD tick with the elapsed sim minutes */
export function tickSatiety(eco, dtMin) {
  const c = cult(eco); if (c.absorb) { c.lastSat = null; return null; } c.sat = Math.max(0, c.sat - drainPerMin(eco) * dtMin); let ate = null;
  if (c.autoEat && c.sat < SAT.low) { const f = foodList(eco)[0]; if (f) { const r = eat(eco, f.item.item_id); if (r.ok) ate = r; } }
  return ate;
}
