// Guanghuan progression rules (V15): nine Guanghuan Realms with hard level gates, Origin Awakening, the Origin Devourer, Origin absorption into Guanghuan slots, Satiety.
// Everything the spec marks "TBD" is decided here (formulas / curves are mine - tune the constants at the top of each block). Pure logic, no DOM.
// v9: Level 1 is pre-awakening and outside the nine Guanghuan Realms.  Awakening only OPENS Guanghuan Slot 1 (empty); the hero stays Lv 1 until an Origin is absorbed into Slot 1 (1 in-game day),
//   which opens Guanghuan Initiate at Lv 2.  Slots 2-9 open at the previous realm cap, and only if the preceding slot is occupied; absorbing an Origin into the new slot = the breakthrough.
// State lives in eco.state.flags.cult:
//   { passed, innate, proof, slots[9] (index = slot - 1), pending, absorb, sat, autoEat, pity }
const ATTR_IDS = ["str", "dex", "agi", "vit", "end", "lck"];
const r2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- realms (level gates)
export const REALMS = [["Guanghuan Initiate", 2, 74], ["Guanghuan Adept", 75, 148], ["Guanghuan Elder", 149, 222], ["Guanghuan Monarch", 223, 296], ["Guanghuan King", 297, 370], ["Guanghuan Ancestor", 371, 444], ["Guanghuan Emperor", 445, 518], ["Guanghuan Sovereign", 519, 592], ["Guanghuan Primordial", 593, 666]]
  .map(([name, lo, hi], i) => ({ n: i + 1, name, lo, hi }));
export const STAGES = ["Early", "Middle", "Late", "Peak"], STAGE_AT = [0, 0.22, 0.5, 0.78];   // stages are not even: Early 22%, Middle 28%, Late 28%, Peak 22% of the realm's levels
export const realmOf = (lv) => REALMS.find((r) => lv <= r.hi) || REALMS[8];
export const stageOf = (lv) => { const r = realmOf(lv), f = (lv - r.lo) / (r.hi - r.lo + 1); let s = 0; STAGE_AT.forEach((a, i) => { if (f >= a) s = i; }); return s; };
export const stageRange = (n, s) => { const r = REALMS[n - 1], len = r.hi - r.lo + 1; return [r.lo + Math.ceil(len * STAGE_AT[s]), s === 3 ? r.hi : r.lo + Math.ceil(len * STAGE_AT[s + 1]) - 1]; };
export const title = (lv) => lv <= 1 ? "Mortal · Lv 1" : `${realmOf(lv).name} · ${STAGES[stageOf(lv)]}`;

export function cult(eco) {
  const f = eco.state.flags, c = (f.cult ||= {}); c.passed ||= 0; c.slots ||= Array(9).fill(null); c.pending ??= null; c.absorb ??= null; c.innate ??= null; c.proof ??= false; if (c.sat == null) c.sat = 100; if (c.autoEat == null) c.autoEat = true; c.lastSat ??= null; return c;
}
const heroLv = (eco) => eco.state.flags?.hero?.lv || 1;
/** realms already broken through (a hero that is simply above a realm - old saves, dev tools - never gets gated behind it) */
export const passedOf = (eco) => Math.max(cult(eco).passed, realmOf(heroLv(eco)).n - 1);
/** why EXP can't turn into levels right now: "awaken" (Lv 1, not awakened) | "slot1" (Lv 1, awakened - absorb an Origin into Slot 1 to open Guanghuan Initiate) | "break" (realm cap reached) | null.  Banked EXP is kept, never lost. */
export function gateOf(eco) {
  const lv = heroLv(eco), c = cult(eco); if (lv <= 1) return c.slots[0] ? null : c.innate ? "slot1" : "awaken";
  const r = realmOf(lv); if (lv >= r.hi && r.n < 9 && passedOf(eco) < r.n) return "break"; return null;
}
/** the Guanghuan slot (1-9) an Origin obtained right now would be absorbed into; 0 = no slot is open */
export const targetSlot = (eco) => { const g = gateOf(eco); return g === "slot1" ? 1 : g === "break" ? realmOf(heroLv(eco)).n + 1 : 0; };
/** state of each of the nine slots: "off" (not awakened) | "locked" | "open" (available, empty) | "full" */
export function slotStates(eco) {
  const c = cult(eco), lv = heroLv(eco), t = targetSlot(eco); return Array.from({ length: 9 }, (_, i) => c.slots[i] ? "full" : lv <= 1 && !c.innate ? "off" : i + 1 === t && (i === 0 || c.slots[i - 1]) ? "open" : "locked");
}

// ---------------------------------------------------------------- currency: 1 Xuan Gold = 100 Xuan Silver, and 1 xc (the game's coin) = 1 Xuan Silver
export const SILVER_PER_GOLD = 100;
export const ROUTES = [{ id: "independent", name: "Independent Awakening", silver: 3 * SILVER_PER_GOLD + 76, blurb: "Full-cost route: 3 Xuan Gold 76 Xuan Silver.", public: false },
  { id: "public", name: "Imperial Public Subsidized Awakening", silver: 10, blurb: "Subsidized route: 10 Xuan Silver.", public: true }];

// ---------------------------------------------------------------- Origin
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
export function rollInnateOrigin(rnd = Math.random) {
  const roll = 1 + Math.floor(rnd() * 100), el = pick(ELEMENTS, rnd), form = pick(FORMS, rnd), quality = Math.max(1, Math.min(100, Math.round(((1 + rnd() * 99) + (1 + rnd() * 99)) / 2)));
  return { roll, rarity: rarityOfRoll(roll), element: el.id, form, quality, mutated: false, name: `${el.name} ${form} Origin` };
}
/** Mutation (decided here): 1-10 mutates up one rarity; 11-40 backlash drops one rarity; 41-100 nothing changes.  Free to try, once. */
export function mutateInnateOrigin(innate, rnd = Math.random) {
  const m = 1 + Math.floor(rnd() * 100); innate.mutRoll = m; innate.tried = true;
  if (m <= 10) { if (innate.rarity < 5) innate.rarity++; else innate.quality = Math.min(100, innate.quality + 15); innate.mutated = true; return "up"; }
  if (m <= 40) { if (innate.rarity > 0) { innate.rarity--; return "down"; } return "none"; } return "none";
}
export const elementOf = (innate) => ELEMENTS.find((e) => e.id === innate?.element) || ELEMENTS[0];
export function awaken(eco, routeId, innate) {   // pays, records the innate, issues the Proof Token
  const c = cult(eco), rt = ROUTES.find((r) => r.id === routeId); if (c.innate) return { ok: false, reason: "done" };
  if (rt) { if (eco.wallet() + 1e-9 < rt.silver) return { ok: false, reason: "no_funds" }; eco.state.wallet_xc = r2(eco.state.wallet_xc - rt.silver); eco.ledger?.("service", -rt.silver, rt.name); }
  c.innate = innate; c.proof = true; c.route = routeId; eco.changed?.(); return { ok: true };
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

// ---------------------------------------------------------------- Origin Beasts, Origin Parts and the Origin Devourer (V15 sections 18-19)
// Beast category, Beast Level, existential age grade (read from the obtained Origin's Parts), traits and Guanghuan eligibility are SEPARATE dimensions.
// The old age-to-colour bands are gone: an Origin is identified by its Parts, never by a colour.
export const ORIGIN_PARTS = [
  ["Halo Frame", "Foundational frame and base structure of the Guanghuan."], ["Orbital Axis", "Main axis that establishes orbital orientation and balance."],
  ["Crown Core", "Central energy core supporting the Crown structure."], ["Energy Flow", "Energy movement and distribution throughout the structure."],
  ["Rune Circuit", "Rune pathways and circuit-like mechanisms within the structure."], ["Orbital Connector", "Connects orbital elements and layers into an integrated structure."],
  ["Orbital Layer", "Forms the layered orbital architecture and configurations."], ["Resonance Pattern", "Aligns resonance between the Guanghuan's components."],
  ["Aura Field", "Manifests the surrounding aura field of the complete structure."]].map(([name, fn], i) => ({ n: i + 1, name, fn }));
export const AGE_GRADES = [[10, 150], [151, 999], [1000, 4999], [5000, 9999], [10000, 49999], [50000, 99999], [100000, 199999], [200000, 499999], [500000, 2000000]];   // Grade 9 is "500,000 years and above"
export const gradeYears = (g) => (g >= 9 ? "500,000+ years" : `${AGE_GRADES[g - 1][0].toLocaleString()}–${AGE_GRADES[g - 1][1].toLocaleString()} years`);
export const partOf = (grade) => ORIGIN_PARTS[Math.max(1, Math.min(9, grade)) - 1];            // the highest-order Part formed = the age grade; the earlier ones stay in the structure
const GRADE_FX = { pct: [2, 3.4, 5.2, 7.6, 10.5, 14, 18, 24, 32], flat: [1, 1.6, 2.4, 3.4, 4.6, 6, 7.6, 10, 13] };   // strength of what an Origin of that grade lends the Guanghuan
export const BEAST_CATS = { ordinary: "Ordinary Beast", origin: "Origin Beast", supreme: "Supreme Beast", demonic: "Demonic Beast", heavenly: "Heavenly Beast" };
export const BEAST_TRAITS = [["rare", "Rare / Unique", 0.06], ["mutated", "Mutated", 0.04], ["corrupted", "Corrupted", 0.03]];     // traits - never extra categories
const KIND = { beast: ["Fang", "cdm", "Critical Damage"], spirit: ["Veil", "ctr", "Chant Time Reduction"], golem: ["Bulwark", "hpr", "HP Regeneration"], critter: ["Dart", "srr", "Skill Recovery Reduction"], slime: ["Bloom", "qir", "Qi Regeneration"] };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
/** which monsters can be an Origin Beast at all: every sub boss / boss, plus beast- and wisp-kind mobs */
export function originEligible(sp, art) { return sp.tier !== "mob" || art?.[sp.art]?.kind === "beast" || art?.[sp.art]?.kind === "spirit"; }
export const isBeast = originEligible;
/** Origin Devourer: the technique that makes extraction possible.  It is learned the moment Origin Awakening completes - before that, defeating a beast yields nothing */
export const hasDevourer = (eco) => !!cult(eco).innate;
/** classification of one beast (decided here): category by tier; the existential age grade is NOT derived from Beast Level (a weak beast can carry a very old Origin);
 *  it leans on the Guanghuan slot being filled so progression stays reachable, with wide random spread */
export function beastOf(sp, lv, rnd = Math.random, slot = null) {
  const x = rnd(), cat = sp.tier === "boss" ? (x < 0.3 ? "supreme" : x < 0.65 ? "demonic" : "heavenly") : sp.tier === "sub" ? (x < 0.35 ? "origin" : x < 0.8 ? "supreme" : "demonic") : (x < 0.62 ? "ordinary" : "origin");
  const lean = slot ? slot : realmOf(lv).n + 1, grade = clampN(Math.round(lean * 0.92 + (rnd() - 0.5) * 3.2 + ({ ordinary: -1, origin: 0, supreme: 0.5, demonic: 0.5, heavenly: 1 }[cat])), 1, 9), [lo, hi] = AGE_GRADES[grade - 1], age = Math.round(lo * Math.pow(hi / lo, rnd()));
  return { cat, grade, age, traits: BEAST_TRAITS.filter((t) => rnd() < t[2]).map((t) => t[0]) };
}
/** chance that a defeated beast turns out to carry an Origin that can be taken (Origin Beast and above; x3 for sub bosses, x4 for bosses; pity and luck raise it; the first slot is eased) */
export function originDropChance(sp, beast, luck = 0, pity = 0, slot = 2) {
  const base = { ordinary: 0, origin: 0.03, supreme: 0.09, demonic: 0.12, heavenly: 0.16 }[beast.cat] * (sp.tier === "boss" ? 4 : sp.tier === "sub" ? 3 : 1);
  return Math.min(0.95, base * (1 + luck / 200) * (1 + Math.min(5, pity * 0.06)) * (slot === 1 ? 2.5 : 1));
}
/** build the obtained Origin: Parts reveal the grade, the cycle record is a separate piece of information, quality is randomised */
export function rollBeastOrigin(eco, sp, art, beast, slot, rnd = Math.random, method = "forced") {
  const lv = heroLv(eco); slot ||= targetSlot(eco) || realmOf(lv).n + 1; slot = clampN(slot, 1, 9); beast ||= beastOf(sp, lv, rnd, slot);
  let quality = ((1 + rnd() * 99) + (1 + rnd() * 99)) / 2; if (beast.traits.includes("rare")) quality += 15; if (beast.traits.includes("mutated")) quality += 8; if (beast.traits.includes("corrupted")) quality -= 10; if (method === "surrender") quality += 10; quality = clampN(Math.round(quality), 1, 100);
  const lives = 1 + Math.floor(rnd() * (2 + beast.grade * 2)), cycle = { lives, now: 1 + Math.floor(rnd() * lives) };   // life-cycle history: deliberately not the same thing as the age in years
  return { id: "o" + Date.now().toString(36) + Math.floor(rnd() * 1e4).toString(36), slot, beast: sp.id, beastName: sp.name, kind: art?.[sp.art]?.kind || "beast", cat: beast.cat, traits: beast.traits, grade: beast.grade, age: beast.age, cycle, quality, method };
}
/** the Origin's ability comes from how it meets the character's own Origin, not from the beast's attacks: primary % on the innate Origin's element attribute + a secondary stat from the beast's nature */
export function originAbility(origin, innate) {
  const el = elementOf(innate), k = KIND[origin.kind] || KIND.beast, q = 0.6 + origin.quality / 100;
  return { name: `${el.name} ${k[0]}`, attr: el.attr, pct: r2(GRADE_FX.pct[origin.grade - 1] * q), stat: k[1], statName: k[2], flat: r2(GRADE_FX.flat[origin.grade - 1] * q) };   // flat = Base Stat points
}
/** called after every kill: while a slot is waiting for its Origin (Level 1 awakened, or a realm cap with the preceding slot occupied) an Origin Beast may offer one.
 *  Returns an offer { sp, beast, slot, surrender, odds } or null.  Nothing is taken until the player answers it (resolveExtraction). */
export function offerExtraction(eco, sp, art, luck, lv, rnd = Math.random) {
  const c = cult(eco), slot = targetSlot(eco); if (!hasDevourer(eco) || !slot || c.pending || c.absorb || !originEligible(sp, art)) return null; if (slot > 1 && !c.slots[slot - 2]) return null;
  const beast = beastOf(sp, lv || heroLv(eco), rnd, slot); if (beast.cat === "ordinary") return null; c.pity = (c.pity || 0) + 1;
  if (rnd() >= originDropChance(sp, beast, luck, c.pity, slot)) return null;
  const surrender = rnd() < 0.12 + luck / 900 + (beast.traits.includes("rare") ? 0.06 : 0), odds = surrender ? 1 : clampN(0.5 + luck / 500 + (slot === 1 ? 0.2 : 0) - Math.max(0, beast.grade - slot) * 0.08 + Math.min(0.25, c.pity * 0.02), 0.2, 0.95);
  return { sp, art: art?.[sp.art]?.kind || "beast", beast, slot, surrender, odds };
}
/** answer an offer.  Forced Extraction can fail (the Origin dissipates, no injury); Voluntary Surrender always succeeds.  Leaving it ("pass") forfeits the Origin. */
export function resolveExtraction(eco, offer, take, rnd = Math.random) {
  const c = cult(eco); if (!offer || !take) return { ok: false, why: "left" };
  if (!offer.surrender && rnd() >= offer.odds) { return { ok: false, why: "dissipated" }; }
  c.pity = 0; c.pending = rollBeastOrigin(eco, offer.sp, { [offer.sp.art]: { kind: offer.art } }, offer.beast, offer.slot, rnd, offer.surrender ? "surrender" : "forced"); eco.changed?.(); return { ok: true, origin: c.pending };
}

// ---------------------------------------------------------------- absorption (= the realm breakthrough)
export const absorbDays = (slot) => 1 + 0.5 * (slot - 1);   // Slot 1 = one full in-game day (V15), +half a day for each later slot (my curve; V15 leaves later durations open)
export const absorbMin = (eco) => Math.round(absorbDays(targetSlot(eco) || 1) * 1440);
export const upkeepEvery = (eco) => (targetSlot(eco) === 1 ? 360 : SAT.upkeepMin);   // the very first absorption is gentler: a food item every 6 sim hours instead of 4
export const upkeepsNeeded = (eco) => Math.ceil(absorbMin(eco) / upkeepEvery(eco));
export const INTERRUPT = { odds: [0.3, 0.4, 0.22, 0.08], from: 0.12, to: 0.9, gap: 0.08 };   // 0 / 1 / 2 / 3 interruptions - never guaranteed
export function canAbsorb(eco) {
  const c = cult(eco), g = gateOf(eco); if (c.absorb) return { ok: false, reason: "busy" }; if (g !== "break" && g !== "slot1") return { ok: false, reason: g === "awaken" ? "awaken" : "no_gate" }; if (g === "break" && !c.slots[realmOf(heroLv(eco)).n - 1]) return { ok: false, reason: "prev_slot" }; if (!c.pending) return { ok: false, reason: "no_slot" };
  if (foodCount(eco) < upkeepsNeeded(eco)) return { ok: false, reason: "food", need: upkeepsNeeded(eco), have: foodCount(eco) }; return { ok: true };
}
export function startAbsorb(eco, rnd = Math.random) {
  const ok = canAbsorb(eco); if (!ok.ok) return ok; const c = cult(eco), dur = absorbMin(eco), t0 = eco.now(), every = upkeepEvery(eco), slot = targetSlot(eco);
  let x = rnd(), n = 0; for (; n < 3; n++) { x -= INTERRUPT.odds[n]; if (x <= 0) break; }
  const ev = []; for (let i = 0; i < n; i++) { const span = INTERRUPT.to - INTERRUPT.from; let f = INTERRUPT.from + span * ((i + rnd() * 0.9) / Math.max(1, n)); f = Math.min(INTERRUPT.to, f); ev.push(t0 + dur * f); }
  c.absorb = { origin: c.pending, slot, every, t0, dur, next: t0 + every, ev, evDone: 0, used: 0, stolen: [], aura: null }; c.pending = null; eco.changed?.(); return { ok: true, absorb: c.absorb };
}
/** protected from theft: tools (equipped gear); the rest is fair game.  1-3 stacks lose 25-60% each */
export function stealItems(eco, rnd = Math.random) {
  const list = eco.bagList().filter((x) => x.item.category !== "tool"), out = []; for (let i = 0; i < 1 + Math.floor(rnd() * 3) && list.length; i++) {
    const j = Math.floor(rnd() * list.length), x = list.splice(j, 1)[0], n = Math.max(1, Math.floor(x.qty * (0.25 + rnd() * 0.35))); if (eco.removeItem(x.item.item_id, n).ok) out.push({ item_id: x.item.item_id, name: x.item.name, n });
  } return out;
}
export function breakthrough(eco, origin) {   // Slot 1: opens Guanghuan Initiate at Lv 2.  Slots 2-9: the breakthrough - first level of the next realm.  Banked EXP continues either way
  const c = cult(eco), h = eco.state.flags.hero, r = realmOf(h.lv);
  if (h.lv <= 1) { h.lv = 2; c.slots[0] = origin; c.absorb = null; eco.changed?.(); return { lv: 2, realm: realmOf(2), slot: 1, first: true }; }
  c.passed = Math.max(c.passed, r.n); h.lv = r.hi + 1; c.slots[r.n] = origin; c.absorb = null; eco.changed?.(); return { lv: h.lv, realm: realmOf(h.lv), slot: r.n + 1, first: false };
}
export function failAbsorb(eco, why) {   // the Origin being absorbed is lost completely (the Guanghuan shell itself is not destroyed); the hero is left near death (5% HP)
  const c = cult(eco), h = eco.state.flags.hero; c.absorb = null; h.hp = 1; h.nearDeath = true; eco.changed?.(); return { why };
}
/** advance the absorption to "now" (also catches up after the app was closed).  hooks: { onUpkeep(ate), onEvent(ev) -> pending, onDone(result) } */
export function tickAbsorb(eco, hooks = {}) {
  const c = cult(eco), a = c.absorb; if (!a) return null; const now = eco.now();
  while (a.next <= now && a.next < a.t0 + a.dur) {
    const f = foodList(eco)[0]; if (!f) { const origin = a.origin; failAbsorb(eco, "food"); hooks.onDone?.({ ok: false, why: "food", origin }); return { done: true }; }
    eco.removeItem(f.item.item_id, 1); a.used++; a.next += a.every || SAT.upkeepMin; hooks.onUpkeep?.(f.item); eco.changed?.();
  }
  while (a.evDone < a.ev.length && a.ev[a.evDone] <= now && !a.aura) { const t = a.ev[a.evDone]; a.aura = { t, started: false }; hooks.onEvent?.(a.aura, now - t > 8); break; }
  if (now >= a.t0 + a.dur) { const origin = a.origin, res = breakthrough(eco, origin); hooks.onDone?.({ ok: true, origin, ...res }); return { done: true }; }
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
  if (c.innate) { const el = elementOf(c.innate), q = 0.75 + c.innate.quality / 200, rar = [0, 2, 4.5, 8, 13, 20][c.innate.rarity] * q; for (const a of ATTR_IDS) add(pct, a, rar); add(pct, el.attr, rar * 0.6); }
  c.slots.forEach((r) => { if (!r || !c.innate) return; const ab = originAbility(r, c.innate); add(pct, ab.attr, ab.pct); add(flat, ab.stat, ab.flat); });
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
