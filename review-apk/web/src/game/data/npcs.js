// Placed NPCs per area (the 96-NPC roster will be added here). kind: "class" = Class Change NPC (the only way to begin / switch a class).
// c / r = preferred tile (the engine moves it to the nearest walkable tile). model = character model used for the field sprite and the dialogue bust.
export const NPCS = {
  village: [{ id: "classmaster", name: "Master Seon", title: "Class Change", model: "samurai", c: 12, r: 14, kind: "class" },
    { id: "awakener", name: "Official Hanryu", title: "Awakening Official", model: "seer", c: 17, r: 14, kind: "awaken", public: true },
    { id: "academy", name: "Scholar Imun", title: "Academy", model: "maiden", c: 22, r: 14, kind: "academy" }],
};
export const npcsOf = (areaId) => (NPCS[areaId] || []).map((n) => ({ ...n }));
