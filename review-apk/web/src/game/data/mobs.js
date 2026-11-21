// Mob roster + hero progression + combat maths for Auto-Grind.
// Zones (areas) follow the design brief: 01-08 Village Outskirts, 09-16 Forest & Foothills, 17-24 Streams & Caves, 25-32 Marshes & Abandoned Shrines,
// 33-40 Mountain Passes & Old Ruins, 41-50 Deeper Wildlands, then one 10-level band per zone up to Lv 100 (zones 7-11: PLACEHOLDER names/themes).
// A sub boss appears every 5 levels, a boss every 10 levels. Monster names are taken from Japanese yokai folklore (kodama, tsuchigumo, kitsunebi, ...).
// Art: every species uses one of the 35 portrait illustrations (public/game-art/monsters/<art>.png), animated as a puppet (see art/monsters.js);
// level 51+ species and all bosses recolour a portrait with hue/sat/bri. The procedural rig (art/mobs.js) is only the fallback while a portrait loads.
// Drops use existing catalogue items by name (names that don't exist in the catalogue are skipped), prices are never touched.

export const MAX_LEVEL = 666;   // player level cap (content - zones, monsters - currently ends at Lv 100)
/** nominal body height in world px (hero = 118), native facing of the portrait (1 = looks right) and the fallback rig kind/tint */
export const ART = {
  green_slime: { h: 58, face: 1, kind: "slime", tint: "#7fcf7f" }, wild_boar: { h: 66, face: 1, kind: "beast", tint: "#8a6a50" }, wooden_spirit: { h: 86, face: 1, kind: "spirit", tint: "#a98a5a" },
  forest_wolf: { h: 78, face: 1, kind: "beast", tint: "#9aa2ad" }, giant_spider: { h: 60, face: 1, kind: "critter", tint: "#5a4a60" }, bandit_thug: { h: 104, face: -1, kind: "spirit", tint: "#5a4a44" },
  blood_boar: { h: 82, face: 1, kind: "beast", tint: "#6a4a4a" }, iron_fang_wolf: { h: 90, face: 1, kind: "beast", tint: "#6a7088" }, venomous_spider: { h: 72, face: 1, kind: "critter", tint: "#6a4a88" },
  toxic_centipede: { h: 64, face: 1, kind: "critter", tint: "#5a4a7a" }, dire_wolf: { h: 98, face: -1, kind: "beast", tint: "#4a4a58" }, jade_serpent: { h: 104, face: -1, kind: "spirit", tint: "#7fd0c8" },
  croc_dragon: { h: 84, face: 1, kind: "beast", tint: "#4a6a4a" }, stone_golem: { h: 126, face: 1, kind: "golem", tint: "#8a90a8" }, gale_crane: { h: 118, face: 1, kind: "critter", tint: "#e8e8f0" },
  cave_demon: { h: 122, face: 1, kind: "spirit", tint: "#6a6aa0" }, spirit_serpent: { h: 108, face: -1, kind: "spirit", tint: "#aad8e8" }, lotus_leech: { h: 80, face: 1, kind: "beast", tint: "#4a6a4a" },
  demonic_flower: { h: 92, face: 1, kind: "spirit", tint: "#7a4a8a" }, paper_revenant: { h: 120, face: 1, kind: "spirit", tint: "#3a4a7a" }, marsh_wisp_beast: { h: 116, face: 1, kind: "spirit", tint: "#6a7a9a" },
  shrine_tanuki: { h: 92, face: 1, kind: "beast", tint: "#8a6a4a" }, soul_fox: { h: 84, face: 1, kind: "spirit", tint: "#d8d8f0" }, spirit_boar: { h: 90, face: 1, kind: "beast", tint: "#c8c4c0" },
  stone_golem_dark: { h: 130, face: 1, kind: "golem", tint: "#4a5a7a" }, cultist_disciple: { h: 112, face: 1, kind: "spirit", tint: "#3a3a6a" }, rogue_cultist: { h: 116, face: 1, kind: "spirit", tint: "#4a3a5a" },
  shadow_bandit: { h: 112, face: 1, kind: "spirit", tint: "#3a3a44" }, wooden_spirit_b: { h: 110, face: 1, kind: "spirit", tint: "#8a7a5a" }, fox_spirit: { h: 88, face: 1, kind: "spirit", tint: "#f0e8ee" },
  vampire_bat: { h: 60, face: 1, kind: "critter", tint: "#4a4468" }, venomous_spider_b: { h: 80, face: 1, kind: "critter", tint: "#5a4a78" }, qilin: { h: 118, face: 1, kind: "beast", tint: "#bcd0f0" },
  abyssal_slime: { h: 62, face: 1, kind: "slime", tint: "#5a78e8" }, celestial_fox: { h: 100, face: 1, kind: "spirit", tint: "#f4f4ff" },
};
export const ART_IDS = Object.keys(ART);

const D = {  // drop tables per zone (existing catalogue names)
  z1: ["Crushed Seashell", "Salt Crystal", "Rabbit Pelt", "Morel Mushroom", "Hawthorn Berry", "Boar Hide", "Leather Offcut"],
  z2: ["Boar Hide", "Wolf Pelt", "Bone Bundle", "Horn Pair", "Feather Bundle", "Leather Offcut", "Fox Pelt"],
  z3: ["Iron Ore", "Tin Ore", "Copper Ore", "Blue Crystal Geode", "Down Feather", "Wild Angelica"],
  z4: ["Silver Ore", "Blue Crystal Geode", "Wild Angelica", "Morel Mushroom", "Bone Bundle", "Zinc Ore"],
  z5: ["Zinc Ore", "Nickel Ore", "Tungsten Ore", "Steel Ingot", "Iron Ingot", "Horn Pair"],
  z6: ["Gold Ore", "Antimony Ore", "Cobalt Ore", "Blue Crystal Geode", "Steel Ingot", "Wildcat Pelt"],
};
for (const z of ["z7", "z8", "z9", "z10", "z11"]) D[z] = ["Gold Ore", "Antimony Ore", "Tungsten Ore", "Steel Ingot", "Cobalt Ore", "Blue Crystal Geode"];
const dr = (z, i, n = 2) => Array.from({ length: n }, (_, k) => D[z][(i + k) % D[z].length]);

let _i = 0;
const M = (z, id, name, jp, art, a, b, o = {}) => ({ id, name, jp, art, z, tier: "mob", lv: [a, b], drops: dr(z, _i++), ...o });
const B = (tier, z, lv, id, name, jp, art, o = {}) => ({ id, name, jp, art, z, tier, lv: [lv, lv], drops: dr(z, _i++, tier === "boss" ? 3 : 2), ...o });

export const MOBS = [
  // 01-08 Village Outskirts: wild creatures, small spirits, weak beasts
  M("z1", "green_slime", "Green Slime", "スライム", "green_slime", 1, 3), M("z1", "inoshishi", "Inoshishi", "猪", "wild_boar", 2, 5), M("z1", "kodama", "Kodama", "木霊", "wooden_spirit", 3, 6),
  M("z1", "yamainu", "Yamainu", "山犬", "forest_wolf", 4, 7), M("z1", "tsuchigumo", "Tsuchigumo", "土蜘蛛", "giant_spider", 5, 8), M("z1", "yamazoku", "Yamazoku Thug", "山賊", "bandit_thug", 6, 8),
  // 09-16 Forest & Foothills: predators, poisonous insects, aggressive beasts
  M("z2", "chi_inoshishi", "Blood Inoshishi", "血猪", "blood_boar", 9, 11), M("z2", "haganeba", "Iron-Fang Ōkami", "鋼牙狼", "iron_fang_wolf", 10, 13), M("z2", "dokugumo", "Dokugumo", "毒蜘蛛", "venomous_spider", 11, 14),
  M("z2", "omukade", "Ōmukade", "大百足", "toxic_centipede", 13, 16), M("z2", "makami", "Makami", "真神", "dire_wolf", 14, 16),
  // 17-24 Streams & Caves: water predators, golems, cave creatures
  M("z3", "hisui_ryuja", "Hisui Ryūja", "翡翠龍蛇", "jade_serpent", 17, 19), M("z3", "kaze_zuru", "Kaze-Zuru", "風鶴", "gale_crane", 17, 20), M("z3", "ishigami", "Ishigami", "石神", "stone_golem", 18, 21),
  M("z3", "mizuchi", "Mizuchi", "蛟", "croc_dragon", 20, 22), M("z3", "iwaya_oni", "Iwaya Oni", "岩屋鬼", "cave_demon", 21, 24), M("z3", "kuchinawa", "Kuchinawa", "朽縄", "spirit_serpent", 22, 24),
  // 25-32 Marshes & Abandoned Shrines: poison, undead, wandering spirits
  M("z4", "hasu_gama", "Hasu-Gama", "蓮蝦蟇", "lotus_leech", 25, 27), M("z4", "yoren", "Yōren", "妖蓮", "demonic_flower", 26, 28), M("z4", "kyonshi", "Fuda Kyonshi", "札僵尸", "paper_revenant", 27, 30),
  M("z4", "toro_shika", "Tōrō-Shika", "灯籠鹿", "marsh_wisp_beast", 28, 31), M("z4", "bake_danuki", "Bake-Danuki", "化け狸", "shrine_tanuki", 29, 32), M("z4", "kitsunebi", "Kitsunebi", "狐火", "soul_fox", 30, 32),
  // 33-40 Mountain Passes & Old Ruins: armored beasts, spirit warriors, guardians
  M("z5", "yama_nushi", "Yama-Nushi", "山主", "spirit_boar", 33, 36), M("z5", "kuro_ishigami", "Kuro-Ishigami", "黒石神", "stone_golem_dark", 34, 38), M("z5", "kage_deshi", "Kage-Deshi", "影弟子", "cultist_disciple", 35, 38),
  M("z5", "datsu_onmyoji", "Datsu-Onmyōji", "堕陰陽師", "rogue_cultist", 36, 39), M("z5", "furu_kodama", "Furu-Kodama", "古木霊", "wooden_spirit_b", 37, 40), M("z5", "kage_shinobi", "Kage Shinobi", "影忍", "shadow_bandit", 38, 40),
  // 41-50 Deeper Wildlands: shape-shifters, Origin Beasts, evolved monsters
  M("z6", "kitsune", "Kitsune", "狐", "fox_spirit", 41, 44), M("z6", "nobusuma", "Nobusuma", "野衾", "vampire_bat", 42, 45), M("z6", "jorogumo", "Jorō-gumo", "絡新婦", "venomous_spider_b", 43, 46),
  M("z6", "kirin", "Kirin", "麒麟", "qilin", 44, 47), M("z6", "shinkai_slime", "Shinkai Slime", "深海", "abyssal_slime", 45, 48), M("z6", "tenko", "Tenko", "天狐", "celestial_fox", 47, 50),
  // 51-100 (PLACEHOLDER zones 7-11): evolved variants - a portrait recoloured per zone
  M("z7", "akaoni", "Akaoni", "赤鬼", "cave_demon", 51, 53, { hue: 150, sat: 1.3 }), M("z7", "ikusa_makami", "Ikusa-Makami", "戦真神", "dire_wolf", 53, 55, { hue: 330, sat: 1.4 }), M("z7", "ochimusha", "Ochimusha", "落武者", "shadow_bandit", 55, 57, { hue: 340, sat: 1.8 }),
  M("z7", "ikusa_kyonshi", "Ikusa Kyonshi", "戦僵尸", "paper_revenant", 57, 59, { hue: 300, sat: 1.4 }), M("z7", "ikusa_ishigami", "Ikusa Ishigami", "戦石神", "stone_golem_dark", 58, 60, { hue: 340, sat: 1.5 }),
  M("z8", "yuki_okami", "Yuki-Ōkami", "雪狼", "forest_wolf", 61, 63, { hue: 175, sat: 0.9, bri: 1.1 }), M("z8", "koori_ishigami", "Kōri Ishigami", "氷石神", "stone_golem", 63, 65, { hue: 170, sat: 1.3, bri: 1.1 }), M("z8", "yuki_kitsune", "Yuki-Kitsune", "雪狐", "celestial_fox", 65, 67, { hue: 160, sat: 0.8, bri: 1.1 }),
  M("z8", "tsurara_gumo", "Tsurara-Gumo", "氷蜘蛛", "venomous_spider_b", 66, 68, { hue: 150, sat: 0.9, bri: 1.25 }), M("z8", "fuyu_kirin", "Fuyu-Kirin", "冬麒麟", "qilin", 68, 70, { hue: 40, sat: 0.7, bri: 1.1 }),
  M("z9", "ryugu_ryuja", "Ryūgū Ryūja", "龍宮龍蛇", "jade_serpent", 71, 73, { hue: 40, sat: 1.1 }), M("z9", "shinen_mizuchi", "Shin'en Mizuchi", "深淵蛟", "croc_dragon", 73, 75, { hue: 150, sat: 1.4 }), M("z9", "kaiyoren", "Kai-Yōren", "海妖蓮", "demonic_flower", 75, 77, { hue: 120, sat: 1.5, bri: 1.15 }),
  M("z9", "mizu_kyonshi", "Mizu-Kyonshi", "水僵尸", "paper_revenant", 77, 79, { hue: 120, sat: 1.1 }), M("z9", "umi_slime", "Umi Slime", "海スライム", "abyssal_slime", 78, 80, { hue: 330, sat: 1.1 }),
  M("z10", "hai_makami", "Hai-Makami", "灰真神", "dire_wolf", 81, 83, { hue: 20, sat: 0.4, bri: 1.1 }), M("z10", "moe_nobusuma", "Moe-Nobusuma", "燃野衾", "vampire_bat", 83, 85, { hue: 330, sat: 1.9, bri: 1.2 }), M("z10", "kazan_ishigami", "Kazan Ishigami", "火山石神", "stone_golem_dark", 85, 87, { hue: 150, sat: 1.9, bri: 1.1 }),
  M("z10", "hai_kitsune", "Hai-Kitsune", "灰狐", "fox_spirit", 87, 89, { hue: 20, sat: 0.4, bri: 0.75 }), M("z10", "enma_oni", "Enma Oni", "炎魔鬼", "cave_demon", 88, 90, { hue: 120, sat: 1.7, bri: 1.1 }),
  M("z11", "tenkyu_kirin", "Tenkyū Kirin", "天宮麒麟", "qilin", 91, 93, { hue: 20, sat: 1.9, bri: 1.1 }), M("z11", "kinko_tenko", "Kinkō Tenko", "金光天狐", "celestial_fox", 93, 95, { hue: 35, sat: 2, bri: 1.05 }), M("z11", "tenmon_ishigami", "Tenmon Ishigami", "天門石神", "stone_golem", 95, 97, { hue: 40, sat: 1.7, bri: 1.2 }),
  M("z11", "hoo_zuru", "Hōō-Zuru", "鳳鶴", "gale_crane", 96, 98, { hue: 330, sat: 1.9, bri: 1.1 }), M("z11", "raiju_ryuja", "Raijū Ryūja", "雷獣龍蛇", "spirit_serpent", 98, 100, { hue: 40, sat: 1.9, bri: 1.2 }),
];
export const SUB_BOSSES = [
  B("sub", "z1", 5, "sub_ushi_inoshishi", "Moss-Tusk Elder", "苔牙の長", "wild_boar", { hue: 70, sat: 1.1 }), B("sub", "z2", 10, "sub_yamazoku_gashira", "Yamazoku Gashira", "山賊頭", "bandit_thug", { hue: 200, sat: 1.2 }),
  B("sub", "z2", 15, "sub_dokugumo_haha", "Brood-Mother Dokugumo", "毒蜘蛛の母", "venomous_spider", { hue: 90, sat: 1.4 }), B("sub", "z3", 20, "sub_ishigami_bancho", "Cavern Warden Ishigami", "洞窟番石神", "stone_golem", { hue: 30, sat: 1.4 }),
  B("sub", "z4", 25, "sub_toro_shika_okami", "Matriarch Tōrō-Shika", "灯籠鹿の主", "marsh_wisp_beast", { hue: 160, sat: 1.4 }), B("sub", "z4", 30, "sub_tanuki_osho", "Abbot Bake-Danuki", "化け狸和尚", "shrine_tanuki", { hue: 330, sat: 1.4 }),
  B("sub", "z5", 35, "sub_ruin_sentinel", "Ruin Sentinel", "遺跡の番人", "stone_golem_dark", { hue: 40, sat: 1.4 }), B("sub", "z5", 40, "sub_ashi_makami", "Ashen Makami Alpha", "灰真神", "dire_wolf", { hue: 20, sat: 0.4, bri: 1.2 }),
  B("sub", "z6", 45, "sub_nanabi_kitsune", "Nine-Veil Kitsune", "九尾の狐", "fox_spirit", { hue: 280, sat: 1.7 }), B("sub", "z6", 50, "sub_shinkai_ou", "Shinkai Slime King", "深海の王", "abyssal_slime", { hue: 280, sat: 1.4 }),
  B("sub", "z7", 55, "sub_ikusa_oni", "Ikusa Oni Taishō", "戦鬼大将", "cave_demon", { hue: 190, sat: 1.6 }), B("sub", "z7", 60, "sub_ikusa_noyuri", "Banner-Bearer Ochimusha", "旗持ち落武者", "shadow_bandit", { hue: 10, sat: 2 }),
  B("sub", "z8", 65, "sub_yuki_onna_okami", "Blizzard Yuki-Ōkami", "吹雪雪狼", "forest_wolf", { hue: 180, sat: 1, bri: 1.2 }), B("sub", "z8", 70, "sub_koori_gumo", "Frost Queen Gumo", "氷蜘蛛女王", "giant_spider", { hue: 170, sat: 1.3, bri: 1.5 }),
  B("sub", "z9", 75, "sub_umibozu", "Umi-Zuru Lord", "海鶴王", "gale_crane", { hue: 190, sat: 1.4 }), B("sub", "z9", 80, "sub_ryugu_ou", "Ryūgū Slime Sovereign", "龍宮の王", "green_slime", { hue: 170, sat: 1.5, bri: 0.8 }),
  B("sub", "z10", 85, "sub_hai_oni", "Cinder Oni Warden", "灰鬼番", "cave_demon", { hue: 40, sat: 1.9 }), B("sub", "z10", 90, "sub_hi_tanuki", "Ember Bake-Danuki", "火狸", "shrine_tanuki", { hue: 30, sat: 1.9 }),
  B("sub", "z11", 95, "sub_tenmon_shugo", "Gate Guardian Shugo", "天門守護", "stone_golem", { hue: 45, sat: 1.9, bri: 1.2 }), B("sub", "z11", 100, "sub_tenko_gozen", "Tenko Gozen", "天狐御前", "celestial_fox", { hue: 40, sat: 2 }),
];
export const BOSSES = [
  B("boss", "z2", 10, "boss_chi_inoshishi", "Ō-Chi-Inoshishi", "大血猪", "blood_boar", { hue: 0, sat: 1.4 }), B("boss", "z3", 20, "boss_ishigami_ou", "Ishigami-Ō", "石神王", "stone_golem_dark", { hue: 330, sat: 1.4 }),
  B("boss", "z4", 30, "boss_mizuchi_ou", "Mizuchi, Marsh Dragon", "沼の蛟", "croc_dragon", { hue: 60, sat: 1.5 }), B("boss", "z5", 40, "boss_oni_taisho", "Kage-Taishō", "影大将", "cultist_disciple", { hue: 330, sat: 1.7 }),
  B("boss", "z6", 50, "boss_kirin_ou", "Kirin Sovereign", "麒麟帝", "qilin", { hue: 40, sat: 1.9, bri: 1.1 }), B("boss", "z7", 60, "boss_akaoni_ou", "Akaoni-Ō", "赤鬼王", "cave_demon", { hue: 160, sat: 1.9 }),
  B("boss", "z8", 70, "boss_fuyu_tenko", "Fuyu Tenko", "冬天狐", "celestial_fox", { hue: 150, sat: 1.1, bri: 1.1 }), B("boss", "z9", 80, "boss_ryugu_mizuchi", "Ryūgū Mizuchi", "龍宮蛟", "croc_dragon", { hue: 160, sat: 1.9, bri: 1.1 }),
  B("boss", "z10", 90, "boss_enma_ou", "Enma-Ō", "閻魔王", "cave_demon", { hue: 90, sat: 2, bri: 0.9 }), B("boss", "z11", 100, "boss_tenjo_kirin", "Tenjō Kirin", "天上麒麟", "qilin", { hue: 20, sat: 2, bri: 1.3 }),
];
export const ROSTER = [...MOBS, ...SUB_BOSSES, ...BOSSES];
export const speciesById = (id) => ROSTER.find((m) => m.id === id) || MOBS[0];
export const TIER_LABEL = { mob: "Mob", sub: "Sub boss", boss: "Boss" };
export const TIER_SCALE = { mob: 1, sub: 1.45, boss: 1.95 };
/** world height of a species (puppet portrait) */
export const sizeOf = (sp) => (ART[sp.art]?.h || 90) * TIER_SCALE[sp.tier];

import { statsOf, LEVEL_CAP, heroRec } from "./progression.js";
import { gateOf } from "./realms.js";

// ---------------------------------------------------------------- hero progression
export const expToNext = (lv) => Math.round(28 * Math.pow(lv, 1.6));   // hard grind: ~30 kills per level around Lv 10
export function getHero(eco) {
  const h = heroRec(eco), st = statsOf(eco); if (h.hp == null || h.hp > st.maxHp) h.hp = st.maxHp; if (h.qi == null || h.qi > st.qiCap) h.qi = st.qiCap; if (!h.species) h.species = defaultSpecies(h.lv); return h;
}
export function defaultSpecies(lv) { let best = MOBS[0]; for (const m of MOBS) if (m.lv[0] <= lv) best = m; return best.id; }
/** returns number of levels gained.  Levelling gives stat points (3 per level) - it never raises an attribute by itself. */
export function addExp(eco, amount) {
  const h = getHero(eco); let up = 0; if (h.lv >= MAX_LEVEL) return 0; h.exp += amount;
  while (h.lv < MAX_LEVEL && !gateOf(eco) && h.exp >= expToNext(h.lv)) { h.exp -= expToNext(h.lv); h.lv++; up++; }   // a gate (awakening / realm cap) banks the EXP instead of levelling
  if (h.lv >= MAX_LEVEL) h.exp = 0; if (up) h.hp = statsOf(eco).maxHp; return up;
}

// ---------------------------------------------------------------- mob maths
const TIER_HP = { mob: 1, sub: 4.5, boss: 11 }, TIER_ATK = { mob: 1, sub: 1.5, boss: 2.1 }, TIER_EXP = { mob: 1, sub: 5, boss: 14 }, TIER_COIN = { mob: 1, sub: 6, boss: 16 };
export const TIER_SIZE = { mob: 58, sub: 88, boss: 124 }, TIER_RESPAWN = { mob: 4, sub: 40, boss: 110 }, TIER_COUNT = { mob: 6, sub: 1, boss: 1 };
export const mobHp = (lv, tier) => Math.round((14 + 7.5 * lv + 0.19 * lv * lv) * TIER_HP[tier]);
export const mobDmg = (lv, tier) => (2 + 1.1 * lv) * TIER_ATK[tier];
export function rollLevel(sp, rnd = Math.random) { return sp.lv[0] + Math.floor(rnd() * (sp.lv[1] - sp.lv[0] + 1)); }
export function rewards(sp, mobLv, heroLv, catalog, rnd = Math.random, luck = 1) {
  const diff = Math.max(0.2, Math.min(1.8, 1 + 0.12 * (mobLv - heroLv)));
  const exp = Math.max(1, Math.round((6 + 3 * mobLv) * TIER_EXP[sp.tier] * diff));
  const xc = Math.round((0.15 + 0.05 * mobLv) * TIER_COIN[sp.tier] * 100) / 100, items = [];
  sp.drops.forEach((name, i) => {
    const it = catalog.byName?.(name); if (!it) return; let q = 0;
    if (sp.tier === "mob") { if (rnd() < (i === 0 ? 0.3 : 0.16) * luck) q = mobLv >= 25 ? 2 : 1; }
    else if (sp.tier === "sub") { if (i === 0 || rnd() < 0.5) q = 1 + Math.floor(rnd() * 2) + (i === 0 ? 1 : 0); }
    else q = 2 + Math.floor(rnd() * 3);
    if (q) items.push({ item_id: it.item_id, quantity: q });
  });
  return { exp, xc, items };
}
/** one swing by the hero: { dmg, crit }.  st = statsOf(eco) (with temporary buffs) */
/** Consistent Damage steadies and lifts NON-crit hits; a Luck-driven share of crits become Deadly (+50% on top of the crit multiplier) */
export function heroHit(st, mobTier, rnd = Math.random) {
  const crit = rnd() * 100 < st.crit, deadly = crit && rnd() * 100 < st.deadly, spread = 0.15 * (1 - Math.min(0.8, st.consDmg * 0.012));
  const d = st.atk * (1 - spread + rnd() * 2 * spread) * (mobTier === "boss" ? 0.9 : 1) * (crit ? (st.critDmg / 100) * (deadly ? 1.5 : 1) : 1 + st.consDmg / 100);
  return { dmg: Math.max(1, Math.round(d)), crit, deadly };
}
export const mobHit = (sp, mobLv, def, rnd = Math.random) => Math.max(1, Math.round(mobDmg(mobLv, sp.tier) * (0.85 + rnd() * 0.3) - def));
