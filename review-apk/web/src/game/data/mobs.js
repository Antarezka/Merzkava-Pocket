// Mob roster + hero progression + combat maths for Auto-Grind.
// The roster is a PLACEHOLDER list (names, levels, drops) — art is drawn procedurally by the engine for now.
// Layout: normal mobs cover Lv 1-50, a sub boss every 5 levels (Lv 5..50), a boss every 10 levels (Lv 10..50).
// Drops use existing catalogue items by name (names that don't exist in the catalogue are skipped), prices are never touched.

export const MAX_LEVEL = 50;
const sp = (id, name, kind, lv, tint, drops) => ({ id, name, kind, tier: "mob", lv, tint, drops });
export const MOBS = [
  sp("green_slime", "Green Slime", "slime", [1, 3], "#7fcf7f", ["Crushed Seashell", "Salt Crystal"]),
  sp("dew_slime", "Dew Slime", "slime", [3, 5], "#7fb6e8", ["Salt Crystal", "Crushed Seashell"]),
  sp("field_hare", "Field Hare", "critter", [4, 7], "#d8c3a0", ["Rabbit Pelt", "Morel Mushroom"]),
  sp("mushroom_imp", "Mushroom Imp", "spirit", [6, 9], "#c97b6a", ["Morel Mushroom", "Hawthorn Berry"]),
  sp("wild_piglet", "Wild Piglet", "beast", [8, 11], "#c9967a", ["Boar Hide", "Leather Offcut"]),
  sp("ember_slime", "Ember Slime", "slime", [10, 13], "#e8775a", ["Copper Ore", "Iron Ore"]),
  sp("ink_crow", "Ink Crow", "critter", [12, 15], "#5a5470", ["Feather Bundle", "Down Feather"]),
  sp("rust_fox", "Rust Fox", "beast", [14, 17], "#e0914f", ["Fox Pelt", "Bone Bundle"]),
  sp("pebble_golem", "Pebble Golem", "golem", [16, 19], "#9a9a8a", ["Iron Ore", "Tin Ore"]),
  sp("reed_sprite", "Reed Sprite", "spirit", [18, 21], "#7fc3a3", ["Wild Angelica", "Hawthorn Berry"]),
  sp("tusk_boar", "Tusk Boar", "beast", [20, 23], "#a1745a", ["Boar Hide", "Horn Pair"]),
  sp("grey_wolf", "Grey Wolf", "beast", [22, 26], "#9aa2ad", ["Wolf Pelt", "Bone Bundle"]),
  sp("mire_slime", "Mire Slime", "slime", [24, 28], "#a583d6", ["Silver Ore", "Blue Crystal Geode"]),
  sp("shade_deer", "Shade Deer", "beast", [26, 30], "#b99a6a", ["Deer Hide", "Horn Pair"]),
  sp("moon_wildcat", "Moon Wildcat", "beast", [28, 32], "#cfc6d8", ["Wildcat Pelt", "Down Feather"]),
  sp("clay_golem", "Clay Golem", "golem", [30, 34], "#b08a68", ["Zinc Ore", "Nickel Ore"]),
  sp("will_o_wisp", "Will-o'-Wisp", "spirit", [32, 36], "#8fd6e0", ["Blue Crystal Geode", "Salt Crystal"]),
  sp("bone_hound", "Bone Hound", "beast", [34, 38], "#e1dccb", ["Bone Bundle", "Leather Offcut"]),
  sp("gilded_slime", "Gilded Slime", "slime", [36, 40], "#e8c85a", ["Gold Ore", "Silver Ore"]),
  sp("oni_cub", "Oni Cub", "spirit", [38, 42], "#d9604f", ["Horn Pair", "Iron Ingot"]),
  sp("geode_beetle", "Geode Beetle", "critter", [40, 44], "#6fb0c8", ["Blue Crystal Geode", "Cobalt Ore"]),
  sp("elder_kodama", "Elder Kodama", "spirit", [42, 46], "#a9d6a0", ["Wild Angelica", "Morel Mushroom"]),
  sp("shrine_guardian", "Shrine Guardian", "golem", [44, 48], "#8d8f9f", ["Tungsten Ore", "Steel Ingot"]),
  sp("void_slime", "Void Slime", "slime", [46, 50], "#6a5aa8", ["Gold Ore", "Antimony Ore"]),
];
const bs = (tier, lv, id, name, kind, tint, drops) => ({ id, name, kind, tier, lv: [lv, lv], tint, drops });
export const SUB_BOSSES = [
  bs("sub", 5, "slime_matron", "Slime Matron", "slime", "#5fbf7a", ["Salt Crystal", "Crushed Seashell"]),
  bs("sub", 10, "warren_elder", "Warren Elder", "critter", "#c9b48c", ["Rabbit Pelt", "Down Feather"]),
  bs("sub", 15, "cap_lord", "Capped Mushroom Lord", "spirit", "#b4584a", ["Morel Mushroom", "Wild Angelica"]),
  bs("sub", 20, "black_tusk", "Black Tusk", "beast", "#5b4a44", ["Boar Hide", "Horn Pair"]),
  bs("sub", 25, "cinder_queen", "Cinder Slime Queen", "slime", "#e0553a", ["Copper Ore", "Silver Ore"]),
  bs("sub", 30, "rust_kitsune", "Rust Kitsune", "beast", "#d98a3d", ["Fox Pelt", "Bone Bundle"]),
  bs("sub", 35, "stone_warden", "Stone Warden", "golem", "#7f8798", ["Zinc Ore", "Nickel Ore"]),
  bs("sub", 40, "pale_alpha", "Pale Hound Alpha", "beast", "#ddd6c4", ["Bone Bundle", "Wolf Pelt"]),
  bs("sub", 45, "hollow_oni", "Hollow Oni", "spirit", "#8a3d4f", ["Horn Pair", "Steel Ingot"]),
  bs("sub", 50, "void_matron", "Void Matron", "slime", "#4d3f86", ["Gold Ore", "Antimony Ore"]),
];
export const BOSSES = [
  bs("boss", 10, "verdant_tyrant", "Verdant Tyrant Slime", "slime", "#4fbf5f", ["Crushed Seashell", "Salt Crystal", "Boar Hide"]),
  bs("boss", 20, "grey_king", "Grey King Wolf", "beast", "#7d8794", ["Wolf Pelt", "Bone Bundle", "Horn Pair"]),
  bs("boss", 30, "ironbark", "Ironbark Colossus", "golem", "#8a6a4a", ["Iron Ingot", "Zinc Ore", "Silver Ore"]),
  bs("boss", 40, "crimson_oni", "Crimson Oni Lord", "spirit", "#c23b3b", ["Horn Pair", "Steel Ingot", "Gold Ore"]),
  bs("boss", 50, "calamity_kodama", "Calamity Kodama", "spirit", "#5aa88a", ["Gold Ore", "Antimony Ore", "Blue Crystal Geode"]),
];
export const ROSTER = [...MOBS, ...SUB_BOSSES, ...BOSSES];
export const speciesById = (id) => ROSTER.find((m) => m.id === id) || MOBS[0];
export const TIER_LABEL = { mob: "Mob", sub: "Sub boss", boss: "Boss" };

// ---------------------------------------------------------------- hero progression
export const expToNext = (lv) => Math.round(20 * Math.pow(lv, 1.55));
export const heroStats = (lv) => ({ maxHp: Math.round(40 + lv * 12), atk: 5 + lv * 2.4, def: lv * 0.7, speed: 0.9 });
export function getHero(eco) {
  const f = eco.state.flags; const h = (f.hero ||= { lv: 1, exp: 0, hp: null, kills: 0, species: null });
  const st = heroStats(h.lv); if (h.hp == null || h.hp > st.maxHp) h.hp = st.maxHp; if (!h.species) h.species = defaultSpecies(h.lv); return h;
}
export function defaultSpecies(lv) { let best = MOBS[0]; for (const m of MOBS) if (m.lv[0] <= lv) best = m; return best.id; }
/** returns number of levels gained */
export function addExp(eco, amount) {
  const h = getHero(eco); let up = 0; if (h.lv >= MAX_LEVEL) return 0; h.exp += amount;
  while (h.lv < MAX_LEVEL && h.exp >= expToNext(h.lv)) { h.exp -= expToNext(h.lv); h.lv++; up++; }
  if (h.lv >= MAX_LEVEL) h.exp = 0; if (up) h.hp = heroStats(h.lv).maxHp; return up;
}

// ---------------------------------------------------------------- mob maths
const TIER_HP = { mob: 1, sub: 4.5, boss: 11 }, TIER_ATK = { mob: 1, sub: 1.5, boss: 2.1 }, TIER_EXP = { mob: 1, sub: 5, boss: 14 }, TIER_COIN = { mob: 1, sub: 6, boss: 16 };
export const TIER_SIZE = { mob: 58, sub: 88, boss: 124 }, TIER_RESPAWN = { mob: 4, sub: 40, boss: 110 }, TIER_COUNT = { mob: 6, sub: 1, boss: 1 };
export const mobHp = (lv, tier) => Math.round((14 + 7.5 * lv + 0.19 * lv * lv) * TIER_HP[tier]);
export const mobDmg = (lv, tier) => (2 + 1.1 * lv) * TIER_ATK[tier];
export function rollLevel(sp, rnd = Math.random) { return sp.lv[0] + Math.floor(rnd() * (sp.lv[1] - sp.lv[0] + 1)); }
export function rewards(sp, mobLv, heroLv, catalog, rnd = Math.random) {
  const diff = Math.max(0.2, Math.min(1.8, 1 + 0.12 * (mobLv - heroLv)));
  const exp = Math.max(1, Math.round((6 + 3 * mobLv) * TIER_EXP[sp.tier] * diff));
  const xc = Math.round((0.15 + 0.05 * mobLv) * TIER_COIN[sp.tier] * 100) / 100, items = [];
  sp.drops.forEach((name, i) => {
    const it = catalog.byName?.(name); if (!it) return; let q = 0;
    if (sp.tier === "mob") { if (rnd() < (i === 0 ? 0.3 : 0.16)) q = mobLv >= 25 ? 2 : 1; }
    else if (sp.tier === "sub") { if (i === 0 || rnd() < 0.5) q = 1 + Math.floor(rnd() * 2) + (i === 0 ? 1 : 0); }
    else q = 2 + Math.floor(rnd() * 3);
    if (q) items.push({ item_id: it.item_id, quantity: q });
  });
  return { exp, xc, items };
}
/** damage dealt by the hero in one swing / by a mob in one hit */
export const heroHit = (lv, mobTier, rnd = Math.random) => Math.max(1, Math.round(heroStats(lv).atk * (0.85 + rnd() * 0.3) * (mobTier === "boss" ? 0.9 : 1)));
export const mobHit = (sp, mobLv, heroLv, rnd = Math.random) => Math.max(1, Math.round(mobDmg(mobLv, sp.tier) * (0.85 + rnd() * 0.3) - heroStats(heroLv).def));
