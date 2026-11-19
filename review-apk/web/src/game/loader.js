// Asset loading for Game Mode: catalogue JSON, world sprites, building images and the character model(s).
import { loadCatalog } from "./data/catalog.js";
import { worldSpriteNames, setBuildingImages, BUILDING_NAMES, buildHomeWorld } from "./art/world.js";
import { ModelKit } from "./art/models.js";
import { buildZoneWorld } from "./art/zones.js";
import { loadMonsterArt } from "./art/monsters.js";
import { ROSTER } from "./data/mobs.js";
import { isHunting } from "./data/areas.js";

const img = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });

/** onProgress(0..1, label). Resolves { catalog, world, kit } */
export async function loadGameAssets({ base = "./", looks = ["burgundy8"], onProgress = () => {} }) {
  const art = base + "game-art/", names = worldSpriteNames(), steps = 3 + names.length + BUILDING_NAMES.length + looks.length; let done = 0;
  const tick = (label) => onProgress(Math.min(0.99, ++done / steps), label);
  const catalogP = loadCatalog(base + "data/").then((c) => { done += 3; onProgress(done / steps, "Item register"); return c; });
  const sprites = {};
  await Promise.all(names.map(async (n) => { const i = await img(`${art}world/sprites/${n}.png`); if (i) sprites[n] = i; tick("Painting the land"); }));
  const bimgs = {}; await Promise.all(BUILDING_NAMES.map(async (n) => { const i = await img(`${art}buildings/${n}.png`); if (i) bimgs[n] = i; tick("Raising the house"); })); setBuildingImages(bimgs);
  const kit = new ModelKit(art);
  for (const l of looks) { await kit.load(l); tick("Waking the villagers"); }
  const catalog = await catalogP, world = buildHomeWorld(sprites), cache = new Map([["home", world]]);
  // area provider: worlds are built on first visit (behind the fade) and kept for the session; monster portraits load with their zone
  const areas = {
    async get(id) {
      if (!cache.has(id)) cache.set(id, id === "village" || id === "palace" ? buildZoneWorld(id, sprites, { biome: "outskirts", seed: id === "palace" ? 5 : 3 }) : buildZoneWorld(id, sprites));
      if (isHunting(id)) await loadMonsterArt(base, ROSTER.filter((sp) => sp.z === id));
      return cache.get(id);
    },
  };
  onProgress(1, "Ready");
  return { catalog, world, kit, art, sprites, areas };
}
