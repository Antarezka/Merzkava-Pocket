// Catalogue loader + deterministic "playable layer". Never alters IDs or prices.
const FILES = ["POCKET_ECONOMY_ITEMS_001_500.json", "POCKET_ECONOMY_ITEMS_501_1000.json", "POCKET_FACILITIES_200.json", "POCKET_PRODUCTION_RECIPES.json"];

export async function loadCatalog(baseUrl = "./data/", fetchImpl = fetch) {
  const [itemsA, itemsB, facilities, recipes] = await Promise.all(FILES.map(async f => {
    const r = await fetchImpl(baseUrl + f);
    if (!r.ok) throw new Error("Catalogue file missing: " + f);
    return r.json();
  }));
  return buildCatalog({ itemsA, itemsB, facilities, recipes });
}

// tool requirement text -> list of tool-name keywords (matched against tool item names)
const TOOL_KEYS = [
  [/\baxe\b/i, ["axe", "hatchet"]], [/saw/i, ["saw"]], [/pickaxe/i, ["pickaxe", "pick"]], [/shovel/i, ["shovel", "spade"]],
  [/hoe/i, ["hoe"]], [/rod/i, ["fishing rod"]], [/cast net/i, ["cast net"]], [/fishing net/i, ["fishing net"]],
  [/basket/i, ["basket"]], [/shears/i, ["shears"]], [/sickle|scythe/i, ["sickle", "scythe"]], [/bucket/i, ["bucket"]],
  [/watering/i, ["watering can"]], [/dibber/i, ["dibber"]], [/hammer/i, ["hammer"]], [/trowel/i, ["trowel"]],
];

export function buildCatalog({ itemsA, itemsB, facilities, recipes }) {
  const items = [...(itemsA.items || itemsA), ...(itemsB.items || itemsB)];
  const facs = facilities.facilities || facilities;
  const recs = recipes.recipes || recipes;
  const pairs = recipes.crop_seed_pairs || [];
  const itemById = new Map(items.map(i => [i.item_id, i]));
  const facilityById = new Map(facs.map(f => [f.facility_id, f]));
  const recipeById = new Map(recs.map(r => [r.recipe_id, r]));
  const byCategory = {};
  for (const i of items) (byCategory[i.category] ||= []).push(i);
  const facilityFamilies = {};
  for (const f of facs) (facilityFamilies[f.family] ||= []).push(f);
  const tools = byCategory.tool || [];
  const toolCache = new Map();
  const toolMatches = text => {
    const key = String(text || "").toLowerCase();
    if (toolCache.has(key)) return toolCache.get(key);
    let ids = tools.filter(t => t.name.toLowerCase() === key).map(t => t.item_id);
    if (!ids.length) {
      const words = new Set();
      for (const [re, ks] of TOOL_KEYS) if (re.test(text)) ks.forEach(k => words.add(k));
      ids = tools.filter(t => { const tw = t.name.toLowerCase().split(/\s+/).join(" "); return [...words].some(w => (" " + tw + " ").includes(" " + w + " ")); }).map(t => t.item_id);
    }
    toolCache.set(key, ids);
    return ids;
  };
  const cropInfo = id => {
    const it = itemById.get(id); if (!it) return null;
    const p = pairs.find(x => x.crop_item_id === id || x.seed_item_id === id);
    return p ? { crop: p.crop_item_id, seed: p.seed_item_id, growSimMin: p.growth_time_sim_minutes, yield: it.passive_growth?.yield_per_plot || 1 } : null;
  };
  const price = id => { const m = itemById.get(id)?.market || {}; return { base: m.base_price_xc ?? 0, shop: m.typical_shop_price_xc ?? m.base_price_xc ?? 0, buyback: m.typical_merchant_buyback_price_xc ?? 0 }; };
  const cheapestTool = kw => tools.filter(t => t.name.toLowerCase().includes(kw)).sort((a, b) => price(a.item_id).base - price(b.item_id).base)[0];
  const byName = n => items.find(i => i.name.toLowerCase() === n.toLowerCase());
  // Onboarding fixture (NOT from catalogue): a tiny kit so 5 xc is playable.
  const kitNames = ["Stone Hatchet", "Stone Pickaxe", "Wooden Shovel", "Gathering Basket", "Herb Shears", "Wooden Bucket", "Trowel", "Seed Dibber", "Fishing Rod", "Wooden Hoe", "Bronze Sickle", "Watering Can"];
  const kit = [];
  for (const k of kitNames) { const t = byName(k); if (t) kit.push({ item_id: t.item_id, quantity: 1 }); }
  const mat = [["Rough Plank", 4], ["Rope Coil", 4]].map(([n, q]) => { const t = byName(n); return t && { item_id: t.item_id, quantity: q }; }).filter(Boolean);
  const starterKit = { fixture: true, wallet_xc: 5, items: kit, materials: mat };
  // Items a resource node can yield (derived from acquisition.method + locations). Cheapest 6 keep quests fair.
  const poolCache = new Map();
  const has = (it, ...ws) => (it.acquisition?.locations || []).some(l => ws.some(w => l.toLowerCase().includes(w)));
  const gatherPool = (kind, variant = "", water = "river") => {
    const key = kind + "|" + variant + "|" + water;
    if (poolCache.has(key)) return poolCache.get(key);
    const M = m => items.filter(i => i.acquisition?.method === m);
    let L;
    if (kind === "tree") L = M("tree_felling");
    else if (kind === "log" || kind === "stump") L = M("woodland_collection_or_cut");
    else if (kind === "rock" || kind === "boulder") L = M("quarrying_or_digging");
    else if (kind === "weed") L = M("foraging_or_hand_harvest").filter(i => has(i, "meadow", "forest floor"));
    else if (kind === "reed") L = M("foraging_or_hand_harvest").filter(i => has(i, "wetland", "riverbank"));
    else if (kind === "herb") L = M("herb_foraging").filter(i => has(i, "meadow", "forest", "riverbank"));
    else if (kind === "water") L = M("water_drawing");
    else if (kind === "fish") L = M("fishing").filter(i => has(i, water));
    else L = [];
    L = [...L].sort((a, b) => price(a.item_id).base - price(b.item_id).base || a.item_id.localeCompare(b.item_id));
    const v = String(variant).toLowerCase();
    const hit = v ? L.filter(i => i.name.toLowerCase().includes(v)) : [];
    const out = (hit.length ? hit : L).slice(0, kind === "water" ? 1 : 6);
    poolCache.set(key, out);
    return out;
  };
  return {
    items, itemById, facilities: facs, facilityById, recipes: recs, recipeById, byCategory, facilityFamilies, cropPairs: pairs,
    toolMatches, cropInfo, price, byName, gatherPool, itemName: id => itemById.get(id)?.name || id, starterKit, derivedRecipes: [],
  };
}
