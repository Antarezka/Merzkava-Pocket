// Areas of the offline world. Moving between areas fades out / in (like a classic MMORPG).
// Chain: Home -> Village -> (Imperial Palace | Zone 1) ; Zone n -> Zone n+1 ... Zone 11. Zones 7-11 are PLACEHOLDER themes.
const MAX_LEVEL = 100;   // content cap: the zones end at Lv 100 (the player level cap is 666)
export const ZONES = [
  { id: "z1", name: "Village Outskirts", lv: [1, 8], theme: "Wild creatures, small spirits, weak beasts" },
  { id: "z2", name: "Forest & Foothills", lv: [9, 16], theme: "Predators, poisonous insects, aggressive beasts" },
  { id: "z3", name: "Streams & Caves", lv: [17, 24], theme: "Water predators, golems, cave creatures" },
  { id: "z4", name: "Marshes & Abandoned Shrines", lv: [25, 32], theme: "Poison, undead, wandering spirits" },
  { id: "z5", name: "Mountain Passes & Old Ruins", lv: [33, 40], theme: "Armored beasts, spirit warriors, guardians" },
  { id: "z6", name: "Deeper Spirit Lands", lv: [41, 50], theme: "Shape-shifters, spirit beasts, evolved monsters" },
  { id: "z7", name: "Crimson Battlefield", lv: [51, 60], theme: "Fallen warriors and war spirits (placeholder)" },
  { id: "z8", name: "Frozen Highlands", lv: [61, 70], theme: "Frost beasts and ice guardians (placeholder)" },
  { id: "z9", name: "Sunken Palace Depths", lv: [71, 80], theme: "Drowned court and deep-water dragons (placeholder)" },
  { id: "z10", name: "Ashen Wastes", lv: [81, 90], theme: "Cinder spirits and fire demons (placeholder)" },
  { id: "z11", name: "Heaven's Gate", lv: [91, MAX_LEVEL], theme: "Celestial guardians (placeholder)" },
];
export const zoneById = (id) => ZONES.find((z) => z.id === id);
export const zoneOfLevel = (lv) => ZONES.find((z) => lv >= z.lv[0] && lv <= z.lv[1]) || ZONES[ZONES.length - 1];
export const isHunting = (areaId) => /^z\d+$/.test(areaId);
/** where each exit of an area leads */
export function exitsOf(areaId) {
  if (areaId === "home") return { south: "village" };
  if (areaId === "village") return { north: "home", east: "z1", west: "palace" };
  if (areaId === "palace") return { east: "village" };
  const i = ZONES.findIndex((z) => z.id === areaId); if (i < 0) return {};
  return { south: i === 0 ? "village" : ZONES[i - 1].id, north: i < ZONES.length - 1 ? ZONES[i + 1].id : null };
}
export const AREA_NAMES = { home: "Home", village: "Village", palace: "Imperial Palace", ...Object.fromEntries(ZONES.map((z) => [z.id, z.name])) };
