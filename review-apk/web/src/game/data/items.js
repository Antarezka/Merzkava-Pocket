// Merzkava Pocket — the self-made register of items, facilities, recipes and crops.
// Everything here is authored for this game (names, prices, yields, recipes); nothing is imported from any external catalogue.
// Compiled once on first use into the shapes the economy expects: items / facilities / recipes / crop_seed_pairs.
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const r2 = (n) => Math.round(n * 100) / 100;

// [name, base price xc, tier?]   -- grouped by category / acquisition method / where it is found
const G = [
  // ---- tools (toolsmith or market)
  ["tool", "toolsmith_or_market", ["market", "toolsmith"], 1, [["Stone Hatchet", 8], ["Stone Pickaxe", 9], ["Wooden Shovel", 7], ["Gathering Basket", 5], ["Herb Shears", 8], ["Wooden Bucket", 5], ["Trowel", 6], ["Seed Dibber", 4], ["Fishing Rod", 12], ["Wooden Hoe", 7], ["Bronze Sickle", 14], ["Watering Can", 9], ["Wood Saw", 12], ["Hammer", 10], ["Whetstone", 6], ["Cast Net", 18], ["Fishing Net", 20]]],
  ["tool", "toolsmith_or_market", ["market", "toolsmith"], 2, [["Iron Hatchet", 26], ["Iron Pickaxe", 28], ["Iron Shovel", 22], ["Iron Sickle", 24], ["Iron Hoe", 20]]],
  ["tool", "toolsmith_or_market", ["market", "toolsmith"], 3, [["Steel Hatchet", 55], ["Steel Pickaxe", 60], ["Steel Shovel", 48]]],
  // ---- timber
  ["raw", "tree_felling", ["forest", "orchard edge"], 1, [["Pine Log", 6], ["Oak Log", 8], ["Birch Log", 6], ["Cedar Log", 9], ["Camphor Log", 11], ["Bamboo Pole", 4]]],
  ["raw", "woodland_collection_or_cut", ["forest", "hillside"], 1, [["Fallen Branch", 2], ["Dry Kindling", 2], ["Bark Strip", 3], ["Moss Bundle", 3], ["Resin Lump", 5], ["Stump Wood", 4]]],
  // ---- stone and ore
  ["raw", "quarrying_or_digging", ["hillside", "riverbank"], 1, [["River Pebble", 2], ["Sand Sack", 2], ["Fieldstone", 3], ["Clay Lump", 3], ["Flint Shard", 4], ["Coal Chunk", 6], ["Quartz Crystal", 12]]],
  ["raw", "quarrying_or_digging", ["mine", "hillside"], 2, [["Iron Ore", 9], ["Copper Ore", 10], ["Tin Ore", 10], ["Zinc Ore", 14], ["Silver Ore", 22], ["Nickel Ore", 18], ["Blue Crystal Geode", 30]]],
  ["raw", "quarrying_or_digging", ["deep mine"], 3, [["Gold Ore", 45], ["Cobalt Ore", 38], ["Antimony Ore", 34], ["Tungsten Ore", 52]]],
  // ---- forage: weeds (meadow / forest floor), reeds (wetland / riverbank)
  ["forage", "foraging_or_hand_harvest", ["meadow", "forest floor"], 1, [["Meadow Grass", 1], ["Wild Clover", 1], ["Dandelion Leaf", 2], ["Plantain Leaf", 2], ["Fern Frond", 2], ["Thistle Down", 2]]],
  ["forage", "foraging_or_hand_harvest", ["wetland", "riverbank"], 1, [["Reed Stalk", 2], ["Cattail Fluff", 2], ["Rush Bundle", 2], ["Lily Pad", 3], ["Marsh Sedge", 2]]],
  ["forage", "foraging_or_hand_harvest", ["orchard", "woodland edge"], 1, [["Hawthorn Berry", 3], ["Wild Chestnut", 3], ["Bamboo Shoot", 4], ["Wild Garlic", 3], ["Mulberry", 3], ["Pine Nut", 5], ["Morel Mushroom", 8], ["Lotus Root", 5], ["Crushed Seashell", 2], ["Salt Crystal", 3]]],
  ["herb", "herb_foraging", ["meadow", "forest"], 1, [["Mint Leaf", 3], ["Mugwort", 4], ["Houttuynia", 4], ["Chrysanthemum", 5], ["Honeysuckle", 5], ["Wild Angelica", 6], ["Licorice Root", 6], ["Ginseng Root", 18], ["Lingzhi Cap", 25]]],
  ["raw", "water_drawing", ["well", "river", "spring"], 1, [["Fresh Water", 1]]],
  // ---- fish
  ["fish", "fishing", ["river", "pond"], 1, [["Crucian Carp", 4], ["River Loach", 4], ["Common Carp", 6], ["Perch", 7], ["Grass Carp", 8], ["Catfish", 9], ["River Trout", 10], ["Freshwater Eel", 12]]],
  ["fish", "fishing", ["lake"], 2, [["Lake Pike", 11], ["Silver Bream", 9], ["Mandarin Fish", 16]]],
  ["fish", "fishing", ["sea", "shore"], 2, [["Sea Bream", 12], ["Mackerel", 8], ["Squid", 13], ["Shrimp", 7]]],
  // ---- monster / hunting drops
  ["raw", "monster_drop", ["monster drops"], 1, [["Rabbit Pelt", 6], ["Boar Hide", 9], ["Leather Offcut", 4], ["Bone Bundle", 5], ["Feather Bundle", 4], ["Down Feather", 6], ["Fox Pelt", 12], ["Wolf Pelt", 14], ["Wildcat Pelt", 16], ["Horn Pair", 18]]],
  // ---- animal products (made by pens, coops, hives)
  ["animal", "husbandry", ["coop", "pen"], 1, [["Hen Egg", 3], ["Goat Milk", 5], ["Wool Fleece", 7], ["Honeycomb", 8], ["Raw Silk", 12]]],
  // ---- processed goods and metals
  ["processed", "workshop_crafting", ["workshop"], 1, [["Rough Plank", 6], ["Rope Coil", 4], ["Charcoal", 5], ["Brick", 4], ["Lime Mortar", 5], ["Nail Pack", 4], ["Flour", 3], ["Polished Rice", 4], ["Tea Brick", 8], ["Thread Spool", 4], ["Cotton Cloth", 7], ["Tanned Leather", 11], ["Glass Pane", 14]]],
  ["processed", "workshop_crafting", ["smithy"], 2, [["Copper Ingot", 16], ["Bronze Ingot", 22], ["Iron Ingot", 20], ["Steel Ingot", 48]]],
  // ---- household
  ["household", "market_or_craft", ["market", "workshop"], 1, [["Writing Paper", 3], ["Ink Stick", 4], ["Candle", 2], ["Lantern Oil", 4], ["Straw Mat", 5], ["Clay Pot", 6], ["Wooden Bowl", 3], ["Bamboo Basket", 5], ["Paper Lantern", 7], ["Wash Basin", 6]]],
  // ---- seeds and crops are generated from CROPS below
];

// food: [name, price, tier]  (tier sets the Satiety value: 10 + 7 x tier)
const FOOD = [["Millet Porridge", 3, 1], ["Steamed Bun", 4, 1], ["Rice Ball", 4, 1], ["Scallion Pancake", 5, 1], ["Noodle Bowl", 7, 2], ["Pan Dumplings", 8, 2], ["Fish Soup", 9, 2], ["Tofu Stew", 8, 2], ["Braised Pork", 12, 3], ["Chestnut Cake", 11, 3], ["Roast Duck", 20, 3], ["Festival Banquet Box", 36, 4]];
// medicine: [name, price, tier, effect]  (effect = fraction of max HP or Qi restored per use)
const MED = [["Poultice Wrap", 4, 1, { hp: 0.08 }], ["Herbal Tonic", 6, 1, { hp: 0.12 }], ["Mint Draught", 5, 1, { hp: 0.1 }], ["Bitter Decoction", 8, 1, { hp: 0.15 }], ["Healing Salve", 14, 2, { hp: 0.25 }], ["Ginseng Brew", 18, 2, { hp: 0.2 }], ["Jade Dew Pill", 30, 3, { hp: 0.35 }], ["Restoring Elixir", 80, 4, { hp: 0.6 }], ["Calm Breath Pill", 12, 2, { qi: 0.15 }], ["Clear Spring Pill", 36, 3, { qi: 0.4 }]];
// crops: [crop, seed price, crop price, growth sim-min, yield per plot]
const CROPS = [["Millet", 2, 3, 90, 3], ["Rice", 3, 4, 120, 3], ["Wheat", 3, 4, 110, 3], ["Soybean", 2, 3, 100, 3], ["Napa Cabbage", 3, 5, 80, 2], ["Radish", 2, 3, 60, 2], ["Cucumber", 3, 4, 70, 2], ["Eggplant", 4, 5, 95, 2], ["Pumpkin", 4, 7, 150, 2], ["Taro", 4, 6, 140, 2], ["Sweet Potato", 4, 6, 130, 3], ["Scallion", 2, 3, 50, 3], ["Garlic", 3, 4, 100, 2], ["Tea Leaf", 6, 9, 180, 2], ["Melon", 5, 8, 160, 2], ["Peanut", 3, 5, 115, 3]];

let _items = null, _built = null;
function buildItems() {
  if (_items) return _items; const out = [], seen = new Set();
  const add = (category, name, base, tier, acq, extra = {}) => {
    const id = "mk." + category + "." + slug(name); if (seen.has(id)) return; seen.add(id);
    out.push({ item_id: id, name, category, unit: "piece", quality_tier: tier, market: { base_price_xc: base, typical_shop_price_xc: r2(base * 1.28), typical_merchant_buyback_price_xc: r2(base * 0.58), currency: "xc" }, acquisition: acq, uses: [], ...extra });
  };
  for (const [category, method, locations, tier, rows] of G) for (const [name, base] of rows) add(category, name, base, tier, { method, locations, tool_requirements: [] });
  for (const [name, base, tier] of FOOD) add("food", name, base, tier, { method: "kitchen_crafting", locations: ["market", "kitchen"], tool_requirements: [] });
  for (const [name, base, tier, effect] of MED) add("medicine", name, base, tier, { method: "apothecary_crafting", locations: ["market", "apothecary"], tool_requirements: [] }, { effect });
  for (const [crop, sp, cp, , y] of CROPS) { add("seed", crop + " Seed", sp, 1, { method: "market", locations: ["market"], tool_requirements: [] }); add("crop", crop, cp, 1, { method: "plant_grow_harvest", locations: ["field"], tool_requirements: [] }, { passive_growth: { yield_per_plot: y } }); }
  return (_items = out);
}
const byNameMap = () => new Map(buildItems().map((i) => [i.name.toLowerCase(), i]));
const mat = (m, name, q) => { const it = m.get(name.toLowerCase()); if (!it) throw new Error("items.js: unknown material " + name); return { item_id: it.item_id, item_name: it.name, quantity: q }; };

// facilities: [id, name, family, cash xc, [[material, qty]...], build sim-min, tools, predecessor ids, outputs [[item, per sim-min]...]]
const F = [
  ["water.barrel", "Rain Barrel", "Water & sanitation", 3, [["Rough Plank", 3], ["Rope Coil", 1]], 90, ["Hammer"], [], [["Fresh Water", 0.06]]],
  ["water.well", "Village Well", "Water & sanitation", 22, [["Fieldstone", 20], ["Pine Log", 12], ["Rough Plank", 4], ["Rope Coil", 4]], 480, ["Wooden Shovel", "Trowel"], [], [["Fresh Water", 0.2]]],
  ["forest.woodlot", "Pine Woodlot", "Forestry & timber", 10, [["Rough Plank", 4], ["Rope Coil", 2], ["Fieldstone", 6]], 240, ["Wooden Shovel"], [], [["Pine Log", 0.05]]],
  ["forest.sawpit", "Sawpit", "Forestry & timber", 14, [["Pine Log", 10], ["Rough Plank", 6], ["Rope Coil", 3]], 300, ["Hammer", "Wood Saw"], [], []],
  ["stone.cut", "Fieldstone Cut", "Stone & mining", 12, [["Rough Plank", 4], ["Rope Coil", 2], ["Pine Log", 6]], 260, ["Stone Pickaxe"], [], [["Fieldstone", 0.07]]],
  ["stone.claypit", "Clay Pit", "Stone & mining", 12, [["Rough Plank", 4], ["Fieldstone", 8]], 220, ["Wooden Shovel"], [], [["Clay Lump", 0.06]]],
  ["fish.pond", "Carp Pond", "Aquaculture & fishing", 26, [["Fieldstone", 24], ["Rough Plank", 6], ["Rope Coil", 4]], 420, ["Wooden Shovel", "Wooden Bucket"], ["facility.water.well", "facility.water.barrel"], [["Common Carp", 0.03]]],
  ["coop.hen", "Hen Coop", "Poultry & livestock", 18, [["Rough Plank", 8], ["Rope Coil", 4], ["Bamboo Pole", 6]], 300, ["Hammer"], [], [["Hen Egg", 0.04]]],
  ["coop.goat", "Goat Pen", "Poultry & livestock", 30, [["Rough Plank", 12], ["Rope Coil", 6], ["Fieldstone", 10]], 420, ["Hammer"], [], [["Goat Milk", 0.03], ["Wool Fleece", 0.015]]],
  ["apiary.hives", "Bee Hives", "Apiary & sericulture", 24, [["Rough Plank", 8], ["Clay Pot", 2]], 240, ["Hammer"], [], [["Honeycomb", 0.02]]],
  ["apiary.silk", "Silk Shed", "Apiary & sericulture", 46, [["Rough Plank", 14], ["Bamboo Basket", 4], ["Cotton Cloth", 4]], 520, ["Hammer"], [], [["Raw Silk", 0.012]]],
  ["farm.plot", "Vegetable Plot", "Farming & horticulture", 6, [["Rough Plank", 2], ["Rope Coil", 1]], 120, ["Wooden Hoe"], [], []],
  ["farm.paddy", "Rice Paddy", "Farming & horticulture", 20, [["Fieldstone", 12], ["Rough Plank", 4]], 360, ["Wooden Shovel", "Wooden Hoe"], ["facility.water.well", "facility.water.barrel"], []],
  ["farm.terrace", "Tea Terrace", "Farming & horticulture", 38, [["Fieldstone", 30], ["Rough Plank", 8], ["Rope Coil", 4]], 540, ["Wooden Shovel", "Wooden Hoe"], ["facility.farm.plot"], []],
  ["store.shed", "Tool Shed", "Storage & logistics", 8, [["Rough Plank", 6], ["Rope Coil", 2], ["Nail Pack", 2]], 200, ["Hammer"], [], []],
  ["store.barn", "Grain Barn", "Storage & logistics", 34, [["Rough Plank", 18], ["Brick", 10], ["Rope Coil", 6]], 480, ["Hammer"], ["facility.store.shed"], []],
  ["kitchen.hearth", "Hearth Kitchen", "Kitchen & food", 16, [["Brick", 10], ["Rough Plank", 4], ["Clay Pot", 2]], 260, ["Hammer"], [], []],
  ["kitchen.mill", "Hand Mill", "Kitchen & food", 15, [["Fieldstone", 12], ["Rough Plank", 4]], 240, ["Hammer"], [], []],
  ["kitchen.rack", "Tea Drying Rack", "Kitchen & food", 12, [["Bamboo Pole", 8], ["Rope Coil", 2]], 180, ["Hammer"], [], []],
  ["craft.smithy", "Village Smithy", "Metalwork", 40, [["Brick", 16], ["Rough Plank", 8], ["Charcoal", 6]], 520, ["Hammer"], ["facility.kitchen.hearth"], []],
  ["craft.kiln", "Clay Kiln", "Pottery & kilns", 22, [["Brick", 12], ["Clay Lump", 8], ["Charcoal", 4]], 360, ["Hammer"], [], []],
  ["craft.loom", "Weaving Loom", "Textile", 28, [["Rough Plank", 10], ["Rope Coil", 4], ["Nail Pack", 4]], 360, ["Hammer"], [], []],
  ["craft.paper", "Paper Workshop", "Scholar's craft", 32, [["Rough Plank", 8], ["Wooden Bucket", 2], ["Bamboo Pole", 10]], 400, ["Hammer"], [], []],
  ["craft.apothecary", "Apothecary Hut", "Apothecary", 26, [["Rough Plank", 10], ["Clay Pot", 4], ["Rope Coil", 2]], 340, ["Hammer"], [], []],
  ["craft.charcoal", "Charcoal Pit", "Metalwork", 9, [["Fieldstone", 8], ["Clay Lump", 4]], 150, ["Wooden Shovel"], [], []],
];
// recipes: [id, name, facility, minutes, [[in, qty]...], [[out, qty]...], tools]
const R = [
  ["wood.plank", "Cut logs into rough planks", "forest.sawpit", 4, [["Pine Log", 2]], [["Rough Plank", 3]], ["Wood Saw"]],
  ["wood.rope", "Twist reeds into rope", "forest.sawpit", 3, [["Reed Stalk", 4]], [["Rope Coil", 1]], []],
  ["wood.nails", "Cut nails from iron", "craft.smithy", 4, [["Iron Ingot", 1]], [["Nail Pack", 6]], ["Hammer"]],
  ["kitchen.porridge", "Boil millet porridge", "kitchen.hearth", 6, [["Millet", 2], ["Fresh Water", 1]], [["Millet Porridge", 2]], []],
  ["kitchen.bun", "Steam buns", "kitchen.hearth", 8, [["Flour", 2], ["Fresh Water", 1]], [["Steamed Bun", 2]], []],
  ["kitchen.riceball", "Press rice balls", "kitchen.hearth", 6, [["Polished Rice", 2]], [["Rice Ball", 2]], []],
  ["kitchen.fishsoup", "Simmer fish soup", "kitchen.hearth", 10, [["Crucian Carp", 1], ["Fresh Water", 1], ["Wild Garlic", 1]], [["Fish Soup", 2]], []],
  ["kitchen.noodle", "Pull noodle bowls", "kitchen.hearth", 10, [["Flour", 2], ["Scallion", 1], ["Fresh Water", 1]], [["Noodle Bowl", 2]], []],
  ["mill.flour", "Grind flour", "kitchen.mill", 5, [["Wheat", 3]], [["Flour", 3]], []],
  ["mill.rice", "Polish rice", "kitchen.mill", 5, [["Rice", 3]], [["Polished Rice", 3]], []],
  ["rack.tea", "Press a tea brick", "kitchen.rack", 12, [["Tea Leaf", 4]], [["Tea Brick", 1]], []],
  ["kiln.brick", "Fire bricks", "craft.kiln", 12, [["Clay Lump", 4], ["Charcoal", 1]], [["Brick", 4]], []],
  ["kiln.pot", "Fire a clay pot", "craft.kiln", 10, [["Clay Lump", 3], ["Charcoal", 1]], [["Clay Pot", 2]], []],
  ["charcoal.burn", "Burn charcoal", "craft.charcoal", 14, [["Pine Log", 4]], [["Charcoal", 3]], []],
  ["smith.copper", "Smelt copper", "craft.smithy", 14, [["Copper Ore", 3], ["Charcoal", 1]], [["Copper Ingot", 1]], ["Hammer"]],
  ["smith.iron", "Smelt iron", "craft.smithy", 16, [["Iron Ore", 3], ["Charcoal", 2]], [["Iron Ingot", 1]], ["Hammer"]],
  ["smith.steel", "Fold steel", "craft.smithy", 24, [["Iron Ingot", 2], ["Charcoal", 3]], [["Steel Ingot", 1]], ["Hammer"]],
  ["smith.hatchet", "Forge an iron hatchet", "craft.smithy", 18, [["Iron Ingot", 2], ["Pine Log", 1]], [["Iron Hatchet", 1]], ["Hammer"]],
  ["loom.cloth", "Weave cotton cloth", "craft.loom", 12, [["Thread Spool", 3]], [["Cotton Cloth", 1]], []],
  ["paper.sheet", "Press writing paper", "craft.paper", 10, [["Bamboo Pole", 2], ["Fresh Water", 2]], [["Writing Paper", 6]], []],
  ["paper.ink", "Grind an ink stick", "craft.paper", 8, [["Charcoal", 2], ["Resin Lump", 1]], [["Ink Stick", 2]], []],
  ["apothecary.tonic", "Brew a herbal tonic", "craft.apothecary", 9, [["Mint Leaf", 2], ["Mugwort", 1], ["Fresh Water", 1]], [["Herbal Tonic", 2]], []],
  ["apothecary.salve", "Cook a healing salve", "craft.apothecary", 14, [["Wild Angelica", 2], ["Honeycomb", 1]], [["Healing Salve", 2]], []],
  ["apothecary.breath", "Roll a calm breath pill", "craft.apothecary", 16, [["Honeysuckle", 2], ["Licorice Root", 1]], [["Calm Breath Pill", 2]], []],
];

export function buildRegister() {
  if (_built) return _built; const items = buildItems(), m = byNameMap();
  const facilities = F.map(([id, name, family, cash, mats, minutes, tools, pre, outs]) => {
    const materials = mats.map(([n, q]) => mat(m, n, q)), up = (k) => ({ cash_fee_xc: r2(cash * (k === 2 ? 2.2 : 4.5)), materials: materials.map((x) => ({ ...x, quantity: Math.ceil(x.quantity * (k === 2 ? 2 : 4)) })), duration_sim_minutes: Math.round(minutes * (k === 2 ? 1.4 : 2)) });
    const storage = family === "Storage & logistics";
    return { facility_id: "facility." + id, name, family, location_requirements: ["Owned plot"], build_requirements: { cash_fee_xc: cash, materials, builder_tools: tools, builders_required: 1, predecessor: pre }, construction: { duration_sim_minutes: minutes },
      levels: [{ level: 1, ...(storage ? { capacity: id === "store.barn" ? 24 : 10 } : {}) }, { level: 2, upgrade: up(2), ...(storage ? { capacity: id === "store.barn" ? 40 : 20 } : {}) }, { level: 3, upgrade: up(3), ...(storage ? { capacity: id === "store.barn" ? 64 : 36 } : {}) }],
      outputs: outs.map(([n, q]) => ({ item_id: mat(m, n, 1).item_id, item_name: n, quantity_per_sim_minute: q })) };
  });
  const recipes = R.map(([id, name, fac, minutes, ins, outs, tools]) => ({ recipe_id: "recipe." + id, name, facility_id: "facility." + fac, active_process_sim_minutes: minutes, inputs: ins.map(([n, q]) => mat(m, n, q)), outputs: outs.map(([n, q]) => mat(m, n, q)), tool_requirements: tools }));
  const crop_seed_pairs = CROPS.map(([crop, , , grow]) => ({ crop_item_id: m.get(crop.toLowerCase()).item_id, seed_item_id: m.get((crop + " Seed").toLowerCase()).item_id, growth_time_sim_minutes: grow }));
  return (_built = { items, facilities, recipes, crop_seed_pairs });
}

/** Things the daily-login gift basket may hand out: everyday, cheap, immediately useful goods (stable order so reward seeds stay deterministic). */
export function rewardPool() {
  return buildItems().filter((i) => ["food", "medicine", "household", "seed"].includes(i.category) && i.market.base_price_xc <= 24);
}
