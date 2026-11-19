// Skill Book: martial arts the hero can learn, level up and put into 4 quick slots (used automatically while Auto is on, or tapped manually).
// Skills are learned from "skill books" (dropped by monsters, a separate collection - not bag items) plus, from tier 2 up, specific catalogue materials.
// Names use East-Asian swordsmanship terms (Korean/Chinese/Japanese). All numbers are placeholders for balancing.
export const MAX_SKILL_LV = 5, SLOT_COUNT = 4;
export const TIER = { 1: ["Mortal", "#c9b08a"], 2: ["Adept", "#7ec8a6"], 3: ["Master", "#7ab0ff"], 4: ["Grandmaster", "#b58cff"], 5: ["Heavenly", "#ffb04a"] };
// books needed to learn at each tier (and x level for upgrades) + materials per tier (catalogue item names that already exist in the economy)
const BOOKS = { 1: 3, 2: 8, 3: 20, 4: 45, 5: 100 };
const MATS = { 1: [], 2: [["Iron Ingot", 3]], 3: [["Steel Ingot", 5], ["Blue Crystal Geode", 3]], 4: [["Gold Ore", 8], ["Cobalt Ore", 6]], 5: [["Tungsten Ore", 15], ["Antimony Ore", 10], ["Gold Ore", 10]] };

// type: hit (single target, n hits) | aoe (around the hero) | heal | buff.  mult = x ATK per hit.  chant = seconds of channelling (reduced by Chant Time Reduction)
const SHORT = { vslash: "V-SLASH", crescent: "CRESCENT", mend: "MEND", ironstance: "GUARD", galeblade: "GALE", thunderpalm: "THUNDER", lotus: "LOTUS", bloodoath: "OATH", skyrend: "AURA", phoenix: "PHOENIX", tigerroar: "ROAR", nineheavens: "SWORD RAIN", voidstep: "VOID", heavendivide: "DIVIDE" };
const S = (id, name, hanja, tier, type, o) => ({ id, name, hanja, tier, type, short: SHORT[id] || name.toUpperCase(), cd: 8, chant: 0.4, zones: [], ...o });
export const SKILLS = [
  S("vslash", "V-Slash", "雙鶴斬", 1, "hit", { en: "Twin Crane Cut", hits: 2, mult: 1.45, cd: 6, chant: 0.3, fx: "vslash", col: "246,214,120", zones: ["z1", "z2"], desc: "Two quick diagonal cuts that meet in a V on one target." }),
  S("crescent", "Crescent Moon Sweep", "月牙掃", 1, "aoe", { en: "Wolgeom Sweep", mult: 1.5, radius: 118, cd: 9, chant: 0.5, fx: "crescent", col: "200,226,255", zones: ["z1", "z2", "z3"], desc: "A wide arc that cuts every enemy around you." }),
  S("mend", "Jade Breath Mending", "玉息", 1, "heal", { en: "Okgi Breathing", heal: 0.35, cd: 18, chant: 0.9, fx: "heal", col: "155,229,168", zones: ["z1", "z2", "z3"], desc: "Slow your breath and restore 35% of max HP." }),
  S("ironstance", "Iron Mountain Stance", "鐵山靠", 1, "buff", { en: "Cheolsan Stance", buff: { def: 0.6, dur: 9 }, cd: 26, chant: 0.4, fx: "guard", col: "190,180,220", zones: ["z1", "z2", "z3"], desc: "Plant your feet: +60% DEF for 9 seconds." }),
  S("galeblade", "Gale Edge Dash", "疾風刃", 2, "hit", { en: "Jilpung Blade", hits: 1, mult: 3.4, cd: 10, chant: 0.6, fx: "dash", col: "180,255,220", zones: ["z2", "z3", "z4"], desc: "Burst forward like a gust and slash through the target." }),
  S("thunderpalm", "Thunder Palm", "雷掌", 2, "aoe", { en: "Noejang", mult: 2.3, radius: 130, cd: 13, chant: 1.0, fx: "thunder", col: "190,170,255", zones: ["z3", "z4", "z5"], desc: "Slam a palm of thunder qi that shocks everything near you." }),
  S("lotus", "Hundred Lotus Flurry", "百蓮亂舞", 2, "hit", { en: "Baengnyeon Flurry", hits: 6, mult: 0.8, cd: 14, chant: 0.8, fx: "flurry", col: "255,190,210", zones: ["z4", "z5", "z6"], desc: "Six rapid cuts, each blossoming like a lotus petal." }),
  S("bloodoath", "Blood Oath Resolve", "血盟意", 2, "buff", { en: "Hyeolmaeng Will", buff: { atk: 0.35, dur: 10 }, cd: 30, chant: 0.5, fx: "rage", col: "255,120,110", zones: ["z3", "z4", "z5"], desc: "Burn your resolve: +35% ATK for 10 seconds." }),
  S("skyrend", "Sky-Rending Sword Aura", "裂天劍罡", 3, "aoe", { en: "Yeolcheon Geomgang", mult: 4.2, radius: 175, cd: 20, chant: 1.4, fx: "aura", col: "255,235,150", zones: ["z5", "z6", "z7"], desc: "Release a sword aura that tears the air in a wide ring." }),
  S("phoenix", "Phoenix Vein Rebirth", "鳳脈再生", 3, "heal", { en: "Bongmaek Rebirth", heal: 0.65, regen: 0.8, cd: 45, chant: 1.6, fx: "heal", col: "255,170,110", zones: ["z5", "z6", "z7", "z8"], desc: "Rekindle your meridians: restore 65% HP and regenerate for 10 seconds." }),
  S("tigerroar", "Tiger Roar Slash", "虎嘯斬", 3, "hit", { en: "Hohyo Slash", hits: 3, mult: 2.1, cd: 16, chant: 1.1, fx: "vslash", col: "255,180,90", zones: ["z6", "z7", "z8"], desc: "Three heavy cuts that end in a roar, shaking the target." }),
  S("nineheavens", "Nine Heavens Sword Rain", "九天劍雨", 4, "aoe", { en: "Gucheon Geomu", mult: 7, radius: 210, cd: 34, chant: 2.0, fx: "rain", col: "170,210,255", zones: ["z8", "z9", "z10"], desc: "Call down a rain of a hundred swords across the whole field." }),
  S("voidstep", "Void-Cutting Step", "斷虛步", 4, "hit", { en: "Danheo Step", hits: 4, mult: 3.2, cd: 28, chant: 1.5, fx: "dash", col: "200,160,255", zones: ["z8", "z9", "z10", "z11"], desc: "Step through the gap between breaths and cut four times." }),
  S("heavendivide", "Heaven-Dividing Sword Intent", "分天劍意", 5, "aoe", { en: "Bunchon Geomui", mult: 15, radius: 260, cd: 60, chant: 2.6, fx: "aura", col: "255,255,255", zones: ["z10", "z11"], desc: "A single sword intent that splits sky and ground." }),
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const STARTER_SLOTS = ["vslash", "crescent", "mend", "ironstance"];

// ---------------------------------------------------------------- saved state (flags.skills)
export function skillRec(eco) {
  const f = eco.state.flags, r = (f.skills ||= { lv: {}, books: {}, slots: [...STARTER_SLOTS], auto: true });
  if (!r.lv.vslash) for (const id of STARTER_SLOTS) r.lv[id] ||= 1;     // the four starters are known from the start
  r.slots ||= [...STARTER_SLOTS]; while (r.slots.length < SLOT_COUNT) r.slots.push(null); r.books ||= {}; r.lv ||= {}; if (r.auto == null) r.auto = true; return r;
}
export const levelOfSkill = (eco, id) => skillRec(eco).lv[id] || 0;
export const booksOf = (eco, id) => skillRec(eco).books[id] || 0;
/** damage / heal scale of a skill level (+14% per level above 1) */
export const levelScale = (lv) => 1 + 0.14 * (Math.max(1, lv) - 1);
/** cost to learn (lv 0 -> 1) or upgrade (lv -> lv+1): books + materials */
export function costOf(sk, lv) {
  const next = lv + 1, books = Math.round(BOOKS[sk.tier] * (lv === 0 ? 1 : next * 0.8)), mats = MATS[sk.tier].map(([name, n]) => [name, Math.ceil(n * (lv === 0 ? 1 : next * 0.7))]);
  return { books, mats, next };
}
export function canLearn(eco, id, catalog) {
  const sk = SKILL[id], lv = levelOfSkill(eco, id); if (!sk) return { ok: false, reason: "invalid" }; if (lv >= MAX_SKILL_LV) return { ok: false, reason: "max" };
  const c = costOf(sk, lv), missing = []; if (booksOf(eco, id) < c.books) missing.push(`${c.books - booksOf(eco, id)} more book(s)`);
  for (const [name, n] of c.mats) { const it = catalog.byName(name); if (!it || eco.total(it.item_id) + 1e-9 < n) missing.push(`${n}× ${name}`); }
  return { ok: !missing.length, missing, cost: c, lv };
}
export function learn(eco, id, catalog) {
  const c = canLearn(eco, id, catalog); if (!c.ok) return c; const r = skillRec(eco);
  r.books[id] = (r.books[id] || 0) - c.cost.books; for (const [name, n] of c.cost.mats) eco._takeTotal(catalog.byName(name).item_id, n);
  r.lv[id] = c.lv + 1; if (c.lv === 0 && !r.slots.includes(id)) { const i = r.slots.indexOf(null); if (i >= 0) r.slots[i] = id; } eco.changed?.(); return { ok: true, lv: r.lv[id] };
}
export function setSlot(eco, slot, id) { const r = skillRec(eco); if (id && !r.lv[id]) return false; if (id) { const o = r.slots.indexOf(id); if (o >= 0 && o !== slot) r.slots[o] = r.slots[slot]; } r.slots[slot] = id; eco.changed?.(); return true; }
export function setAuto(eco, on) { skillRec(eco).auto = !!on; eco.changed?.(); }
/** books are a separate collection (they do not use bag slots) */
export function addBooks(eco, id, n) { const r = skillRec(eco); r.books[id] = (r.books[id] || 0) + n; eco.changed?.(); }
/** drop roll for one kill: normal monsters rarely, sub bosses often, bosses always.  luck = Loot & book luck %.  Returns [{id, n}] */
export function rollBooks(sp, luck = 0, rnd = Math.random) {
  const pool = SKILLS.filter((s) => s.zones.includes(sp.z)); if (!pool.length) return [];
  const k = 1 + luck / 100, chance = sp.tier === "boss" ? 1 : sp.tier === "sub" ? 0.4 * k : 0.035 * k, out = [];
  if (rnd() >= chance) return out;
  // heavier skills are rarer: weight 1 / tier^1.3
  const w = pool.map((s) => 1 / Math.pow(s.tier, 1.3)), tot = w.reduce((a, b) => a + b, 0); let x = rnd() * tot, pick = pool[0]; for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { pick = pool[i]; break; } }
  out.push({ id: pick.id, n: sp.tier === "boss" ? 2 + Math.floor(rnd() * 3) : sp.tier === "sub" ? 1 + Math.floor(rnd() * 2) : 1 }); return out;
}
