// Classes, class Skill Books and the persistent Skill Library (design brief v2).
//  * characters start UNCLASSED with four basic techniques; classes are acquired from the Class Change NPC (several can be owned, ONE is active)
//  * every class has its own sparse Skill Book tree (milestone levels 9 / 20 / 60 ...) + four signature Ultimates at Lv 100 / 300 / 404 / 666
//  * unlocking a skill needs: the class (owned), the character level, the parent skill, skill books (monster drops) and, from tier 2 up, catalogue materials
//  * an unlocked ordinary skill stays in the Skill Library and can be equipped whatever class / weapon is active; an Ultimate only works while ITS class is active
//  * the Skill Book screen shows only the ACTIVE class; unowned classes and Advanced Classes are never shown (no locked entries, silhouettes or hints)
// Names / numbers are placeholders - the brief says the detailed skill lists are still to be designed.
export const SLOT_COUNT = 4, FIRST_CLASS_LEVEL = 9, ULT_LEVELS = [100, 300, 404, 666];
export const CLASS_COST = 8, SWITCH_COST = 2;     // xc (placeholder)
export const TIER = { 1: ["Mortal", "#c9b08a"], 2: ["Adept", "#7ec8a6"], 3: ["Master", "#7ab0ff"], 4: ["Grandmaster", "#b58cff"], 5: ["Heavenly", "#ffb04a"] };
const BOOKS = { 1: 3, 2: 8, 3: 20, 4: 45, 5: 100 };
const MATS = { 1: [], 2: [["Iron Ingot", 3]], 3: [["Steel Ingot", 5], ["Blue Crystal Geode", 3]], 4: [["Gold Ore", 8], ["Cobalt Ore", 6]], 5: [["Tungsten Ore", 15], ["Antimony Ore", 10], ["Gold Ore", 10]] };
const tierOf = (s) => (s.ult ? [3, 4, 5, 5][s.ult - 1] : s.lv < 20 ? 1 : s.lv < 60 ? 2 : s.lv < 150 ? 3 : 4);

export const CLASSES = [
  { id: "reaper", name: "Reaper", weapon: "Straight double-edged sword", identity: "Precision, agility, critical strikes", m: "crane", c: "azure" },
  { id: "monk", name: "Monk", weapon: "Staff", identity: "Staff-based martial discipline", m: "staff", c: "jade" },
  { id: "ghostneedle", name: "Ghostneedle", weapon: "Shuriken & throwing weapons", identity: "Ranged precision, concealed projectiles", m: "shuriken", c: "violet" },
  { id: "striker", name: "Striker", weapon: "Gauntlets", identity: "Close-range martial arts, combinations", m: "fist", c: "orange" },
  { id: "sworddemon", name: "Sword Demon", weapon: "Saber", identity: "Saber-focused martial discipline", m: "saber", c: "crimson" },
  { id: "breaker", name: "Breaker", weapon: "Heavy swords", identity: "Heavy attacks, overwhelming force", m: "heavy", c: "ember" },
  { id: "eclipse", name: "Eclipse Sovereign", weapon: "Paired blades", identity: "Dual-weapon techniques", m: "twin", c: "rose" },
  { id: "war", name: "War Sovereign", weapon: "Spear", identity: "Spear mastery, battlefield reach", m: "spear", c: "gold" },
];
export const CLASS = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
/** Advanced Classes are discovered in the world (achievement clues + lore + NPC side quest). They are intentionally NOT in CLASSES and never listed by any UI: only an ACQUIRED one may appear. */
export const ADVANCED = [{ id: "heavenlydemon", name: "Heavenly Demon" }, { id: "heavenlysovereign", name: "Heavenly Sovereign" }];

const DEF = { hit: { cd: 9, chant: 0.5, fx: "vslash" }, aoe: { cd: 12, chant: 0.8, fx: "aura" }, heal: { cd: 20, chant: 0.9, fx: "heal" }, buff: { cd: 28, chant: 0.4, fx: "guard" } };
const COL = { azure: "78,168,255", jade: "63,224,160", violet: "169,123,255", orange: "255,138,61", crimson: "255,90,74", ember: "255,95,42", rose: "255,122,168", gold: "255,194,71", white: "238,243,255", ink: "211,217,234", ice: "143,230,255", teal: "47,212,212" };
const zoneOfLv = (lv) => "z" + Math.min(11, Math.max(1, Math.ceil(lv / 10)));
function S(cls, key, name, lv, parent, type, m, c, o = {}) {
  const id = cls === "basic" ? key : `${cls}.${key}`, d = DEF[type];
  const s = { id, key, name, cls, lv, parent: parent ? `${cls}.${parent}` : null, type, m, c, cd: d.cd, chant: d.chant, fx: d.fx, col: COL[c] || "255,255,255", mult: 1, hits: 1, ...o };
  s.short = (o.short || name.split(" ").slice(0, 2).join(" ")).toUpperCase(); s.zone = o.zone || zoneOfLv(Math.max(lv, 5)); return s;
}
const ULT = [["Verdict", 12, 70, 2.2, 230], ["Heavens", 24, 90, 2.6, 260], ["Sovereign", 40, 110, 3.0, 300], ["Finale", 70, 150, 3.6, 360]];
function ults(cls, list) {    // list = [[name, motif, palette, type?]] x4
  return list.map(([name, m, c, type], i) => S(cls, `ult${i + 1}`, name, ULT_LEVELS[i], null, type || "aoe", m, c, { ult: i + 1, mult: ULT[i][1], cd: ULT[i][2], chant: ULT[i][3], radius: ULT[i][4], hits: type === "hit" ? 5 : 1, fx: type === "hit" ? "flurry" : "aura", zone: ["z10", "z11", "z11", "z11"][i] }));
}
export const SKILLS = [
  // ---- basic techniques: known by every character, no class needed
  S("basic", "vslash", "V-Slash", 1, null, "hit", "vslash", "gold", { hits: 2, mult: 1.45, cd: 6, chant: 0.3, desc: "Two quick diagonal cuts that meet in a V on one target." }),
  S("basic", "crescent", "Crescent Sweep", 1, null, "aoe", "crescent", "ice", { mult: 1.5, radius: 118, cd: 9, chant: 0.5, fx: "crescent", desc: "A wide arc that cuts every enemy around you." }),
  S("basic", "mend", "Jade Breath", 1, null, "heal", "gourd", "jade", { heal: 0.35, cd: 18, chant: 0.9, desc: "Slow your breath and restore 35% of max HP." }),
  S("basic", "ironstance", "Iron Mountain", 1, null, "buff", "mountain", "white", { buff: { def: 0.6, dur: 9 }, cd: 26, desc: "Plant your feet: +60% DEF for 9 seconds." }),
  // ---- Reaper
  S("reaper", "flash", "Twin Crane Flash", 9, null, "hit", "crane", "azure", { hits: 3, mult: 1.1, cd: 8, chant: 0.4, fx: "flurry", desc: "Three precise cuts that favour critical strikes." }),
  S("reaper", "step", "Cold Needle Step", 20, "flash", "hit", "needles", "ice", { mult: 4.2, cd: 11, chant: 0.5, fx: "dash", desc: "Slip through the gap and pierce the target." }),
  S("reaper", "moon", "Moonless Reaping", 60, "step", "aoe", "eclipse", "violet", { mult: 4.6, radius: 170, cd: 18, chant: 1.0, fx: "crescent", desc: "A silent sweep that reaps everything in reach." }),
  ...ults("reaper", [["Dawn Verdict", "sun", "gold"], ["Ten Thousand Cranes", "crane", "white", "hit"], ["Silent Heaven Severance", "void", "violet"], ["Final Reap of Nine Hells", "skull", "azure"]]),
  // ---- Monk
  S("monk", "sweep", "Iron Staff Sweep", 9, null, "aoe", "staff", "jade", { mult: 1.9, radius: 140, cd: 10, chant: 0.6, fx: "crescent", desc: "A grounded sweep that knocks the whole pack back." }),
  S("monk", "wall", "Diamond Palm Wall", 20, "sweep", "buff", "bell", "gold", { buff: { def: 0.8, dur: 12 }, cd: 30, desc: "Harden your body: +80% DEF for 12 seconds." }),
  S("monk", "dragon", "Rising Dragon Staff", 60, "wall", "hit", "dragon", "teal", { hits: 2, mult: 2.6, cd: 14, chant: 0.8, desc: "Two rising strikes that carry a dragon's weight." }),
  ...ults("monk", [["Heavenly Bell Toll", "bell", "gold"], ["Nine-Ring Pilgrimage", "bagua", "jade"], ["Arhat's Golden Body", "taiji", "orange"], ["Final Strike of Enlightenment", "sun", "white"]]),
  // ---- Ghostneedle
  S("ghostneedle", "stars", "Scatter Stars", 9, null, "aoe", "shuriken", "violet", { mult: 1.7, radius: 150, cd: 9, chant: 0.5, fx: "flurry", desc: "Throw a ring of stars that hits everything near you." }),
  S("ghostneedle", "rain", "Shadow Needle Rain", 20, "stars", "hit", "needles", "ink", { hits: 5, mult: 0.9, cd: 12, chant: 0.7, fx: "rain", desc: "Five hidden needles into one target." }),
  S("ghostneedle", "mark", "Ghost Flame Mark", 60, "rain", "aoe", "spirit", "teal", { mult: 3.6, radius: 160, cd: 17, chant: 1.0, desc: "Mark the field with pale spirit flame." }),
  ...ults("ghostneedle", [["Hundred Shadow Hail", "needles", "ink"], ["Origin-Stitching Needles", "needles", "rose", "hit"], ["Night Without Dawn", "eclipse", "violet"], ["Empty Heaven Barrage", "void", "white"]]),
  // ---- Striker
  S("striker", "combo", "Thunder Fist Combo", 9, null, "hit", "fist", "orange", { hits: 4, mult: 1.0, cd: 8, chant: 0.4, fx: "flurry", desc: "Four quick punches with thunder qi." }),
  S("striker", "palm", "Shattering Palm", 20, "combo", "aoe", "bolt", "gold", { mult: 2.4, radius: 130, cd: 11, chant: 0.7, fx: "thunder", desc: "A palm strike that shocks everything close." }),
  S("striker", "fury", "Fury Resolve", 60, "palm", "buff", "flame", "ember", { buff: { atk: 0.5, dur: 12 }, cd: 30, fx: "rage", desc: "Fury burns hotter: +50% ATK for 12 seconds." }),
  ...ults("striker", [["Thousand Fist Storm", "claws", "ember", "hit"], ["Heaven-Rending Palm", "bolt", "gold"], ["Dragon-Tiger Burst", "tiger", "orange"], ["Mountain Collapse Fist", "mountain", "crimson"]]),
  // ---- Sword Demon
  S("sworddemon", "arc", "Crimson Saber Arc", 9, null, "hit", "saber", "crimson", { mult: 3.6, cd: 8, chant: 0.4, desc: "One heavy curved cut." }),
  S("sworddemon", "frenzy", "Blood Frenzy", 20, "arc", "buff", "flame", "crimson", { buff: { atk: 0.45, dur: 12 }, cd: 28, fx: "rage", desc: "The saber thirsts: +45% ATK for 12 seconds." }),
  S("sworddemon", "cleave", "Hundred Wounds Cleave", 60, "frenzy", "aoe", "claws", "rose", { mult: 3.9, radius: 160, cd: 16, chant: 0.9, fx: "crescent", desc: "A cleave that opens a hundred wounds." }),
  ...ults("sworddemon", [["Demon Moon Slash", "crescent", "rose"], ["Bloodtide Reaving", "wave", "crimson"], ["Nine Hells Saber", "skull", "ember"], ["Sword Demon's Sovereignty", "dragon", "violet", "hit"]]),
  // ---- Breaker
  S("breaker", "split", "Mountain Splitter", 9, null, "hit", "heavy", "ember", { mult: 5, cd: 10, chant: 0.9, desc: "A slow overhead blow that splits stone." }),
  S("breaker", "quake", "Quake Slam", 20, "split", "aoe", "mountain", "gold", { mult: 2.6, radius: 150, cd: 12, chant: 0.8, fx: "thunder", desc: "Slam the ground and shake everything near." }),
  S("breaker", "bulwark", "Unyielding Bulwark", 60, "quake", "buff", "seal", "ink", { buff: { def: 0.9, dur: 12 }, cd: 30, desc: "Become a wall: +90% DEF for 12 seconds." }),
  ...ults("breaker", [["Avalanche Verdict", "mountain", "ink"], ["World-Cracking Blow", "void", "ember", "hit"], ["Titan Boundary", "bagua", "gold"], ["Heaven's Anvil", "heavy", "white"]]),
  // ---- Eclipse Sovereign
  S("eclipse", "dance", "Twin Moon Dance", 9, null, "hit", "twin", "rose", { hits: 6, mult: 0.7, cd: 9, chant: 0.5, fx: "flurry", desc: "Six rapid cuts from both blades." }),
  S("eclipse", "veil", "Eclipse Veil", 20, "dance", "buff", "eclipse", "azure", { buff: { def: 0.5, atk: 0.2, dur: 12 }, cd: 28, desc: "A shadow veil: +50% DEF and +20% ATK for 12 seconds." }),
  S("eclipse", "cross", "Sun-Moon Crossing", 60, "veil", "aoe", "sun", "gold", { mult: 3.4, radius: 170, cd: 15, chant: 0.9, desc: "Two arcs cross where the enemies stand." }),
  ...ults("eclipse", [["Total Eclipse Edge", "eclipse", "violet"], ["Dawn and Dusk Cross", "sun", "ember", "hit"], ["Starless Twin Heavens", "void", "ice"], ["Sovereign of Day and Night", "taiji", "white"]]),
  // ---- War Sovereign
  S("war", "thrust", "Dragon Lance Thrust", 9, null, "hit", "spear", "gold", { mult: 4, cd: 9, chant: 0.5, fx: "dash", desc: "A long, straight thrust with reach." }),
  S("war", "banner", "Sweeping Banner", 20, "thrust", "aoe", "fan", "crimson", { mult: 2.2, radius: 170, cd: 11, chant: 0.7, fx: "crescent", desc: "Sweep the spear and its banner through the line." }),
  S("war", "oath", "Warbanner Oath", 60, "banner", "buff", "talisman", "gold", { buff: { atk: 0.3, def: 0.3, dur: 12 }, cd: 30, desc: "Raise the banner: +30% ATK and DEF for 12 seconds." }),
  ...ults("war", [["Ten Thousand Spear Charge", "spear", "ember"], ["Heavenly Army Descent", "cloud", "azure"], ["Dragon-Slaying Lance", "dragon", "crimson", "hit"], ["Sovereign's Last Charge", "sun", "gold"]]),
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const skillsOfClass = (cls) => SKILLS.filter((s) => s.cls === cls);
export const STARTER_SLOTS = ["vslash", "crescent", "mend", "ironstance"];

// ---------------------------------------------------------------- saved state
export function skillRec(eco) {
  const f = eco.state.flags, r = (f.skills ||= { owned: {}, books: {}, slots: [...STARTER_SLOTS], auto: true });
  r.owned ||= {}; r.books ||= {}; if (!r.slots) r.slots = [...STARTER_SLOTS]; while (r.slots.length < SLOT_COUNT) r.slots.push(null); if (r.auto == null) r.auto = true;
  for (const s of STARTER_SLOTS) r.owned[s] ||= 1; return r;
}
export function classRec(eco) { const f = eco.state.flags, c = (f.cls ||= { owned: [], active: null }); c.owned ||= []; return c; }
export const activeClass = (eco) => CLASS[classRec(eco).active] || null;
export const ownsClass = (eco, id) => classRec(eco).owned.includes(id);
export const isUnlocked = (eco, id) => !!skillRec(eco).owned[id];
export const booksOf = (eco, id) => skillRec(eco).books[id] || 0;
export const tierLabel = (s) => TIER[tierOf(s)];
/** Qi a skill costs before the Qi Consumption / Reduction stats: tier 1 ~10, tier 4 ~36, Ultimates 70 / 110 / 150 / 190 (heals and buffs +20%) */
export const qiCost = (s) => Math.round(s.ult ? 70 + 40 * (s.ult - 1) : (10 + (tierOf(s) - 1) * 8.7) * (s.type === "heal" || s.type === "buff" ? 1.2 : 1));
/** can this skill be USED right now?  (an Ultimate needs its own class to be the active one) */
export function usable(eco, id) { const s = SKILL[id]; if (!s || !isUnlocked(eco, id)) return { ok: false, why: "Not learned." }; if (s.ult && classRec(eco).active !== s.cls) return { ok: false, why: `Needs the ${CLASS[s.cls].name} class active.` }; return { ok: true }; }

// ---------------------------------------------------------------- classes
export function canAcquireClass(eco, id, level) { if (!CLASS[id]) return { ok: false, reason: "invalid" }; if (ownsClass(eco, id)) return { ok: false, reason: "owned" }; if (level < FIRST_CLASS_LEVEL) return { ok: false, reason: "level" }; if (eco.wallet() + 1e-9 < CLASS_COST) return { ok: false, reason: "funds" }; return { ok: true }; }
export function acquireClass(eco, id, level, free = false) { const c = free ? { ok: !ownsClass(eco, id) } : canAcquireClass(eco, id, level); if (!c.ok) return c; if (!free) eco.state.wallet_xc = Math.round((eco.state.wallet_xc - CLASS_COST) * 100) / 100; const r = classRec(eco); r.owned.push(id); r.active = id; eco.changed?.(); return { ok: true }; }
export function switchClass(eco, id) { if (!ownsClass(eco, id)) return { ok: false, reason: "not_owned" }; const r = classRec(eco); if (r.active === id) return { ok: false, reason: "active" }; if (eco.wallet() + 1e-9 < SWITCH_COST) return { ok: false, reason: "funds" }; eco.state.wallet_xc = Math.round((eco.state.wallet_xc - SWITCH_COST) * 100) / 100; r.active = id; eco.changed?.(); return { ok: true }; }

// ---------------------------------------------------------------- unlocking skills in a class Skill Book
export function costOf(s) { const t = tierOf(s); return { books: BOOKS[t], mats: MATS[t] }; }
export function canUnlock(eco, id, catalog, level) {
  const s = SKILL[id]; if (!s || s.cls === "basic") return { ok: false, reasons: ["invalid"] }; if (isUnlocked(eco, id)) return { ok: false, reasons: ["done"] };
  const why = []; if (!ownsClass(eco, s.cls)) why.push("class"); if (level < s.lv) why.push(`Lv ${s.lv}`); if (s.parent && !isUnlocked(eco, s.parent)) why.push("previous skill");
  const c = costOf(s); if (booksOf(eco, id) < c.books) why.push(`${c.books - booksOf(eco, id)} more book(s)`);
  for (const [name, n] of c.mats) { const it = catalog.byName(name); if (!it || eco.total(it.item_id) + 1e-9 < n) why.push(`${n}× ${name}`); }
  return { ok: !why.length, reasons: why, cost: c };
}
export function unlock(eco, id, catalog, level) {
  const c = canUnlock(eco, id, catalog, level); if (!c.ok) return c; const r = skillRec(eco);
  r.books[id] = (r.books[id] || 0) - c.cost.books; for (const [name, n] of c.cost.mats) eco._takeTotal(catalog.byName(name).item_id, n); r.owned[id] = 1; eco.changed?.(); return { ok: true };
}
export function setSlot(eco, slot, id) { const r = skillRec(eco); if (id && !r.owned[id]) return false; if (id) { const o = r.slots.indexOf(id); if (o >= 0 && o !== slot) r.slots[o] = r.slots[slot]; } r.slots[slot] = id; eco.changed?.(); return true; }
export function setAuto(eco, on) { skillRec(eco).auto = !!on; eco.changed?.(); }
export function addBooks(eco, id, n) { const r = skillRec(eco); r.books[id] = (r.books[id] || 0) + n; eco.changed?.(); }
/** drop roll for one kill: normal monsters rarely, sub bosses often, bosses always.  Books of every class can drop (collect them for classes you will own). luck = Loot & book luck % */
export function rollBooks(sp, luck = 0, rnd = Math.random) {
  const zi = Number(sp.z.slice(1)), pool = SKILLS.filter((s) => s.cls !== "basic" && Math.abs(Number(s.zone.slice(1)) - zi) <= 1); if (!pool.length) return [];
  const k = 1 + luck / 100, chance = sp.tier === "boss" ? 1 : sp.tier === "sub" ? 0.4 * k : 0.035 * k; if (rnd() >= chance) return [];
  const w = pool.map((s) => 1 / Math.pow(tierOf(s), 1.3)), tot = w.reduce((a, b) => a + b, 0); let x = rnd() * tot, pick = pool[0]; for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { pick = pool[i]; break; } }
  return [{ id: pick.id, n: sp.tier === "boss" ? 2 + Math.floor(rnd() * 3) : sp.tier === "sub" ? 1 + Math.floor(rnd() * 2) : 1 }];
}
// ---------------------------------------------------------------- Advanced Classes: state only, no UI (discovery happens through achievements, lore and NPCs)
export function advancedRec(eco) { const f = eco.state.flags, a = (f.adv ||= { clues: {}, lore: {}, silhouette: [], owned: [] }); return a; }
