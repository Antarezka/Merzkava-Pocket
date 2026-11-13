import { mulberry32 } from "../art/paint.js";

export const MERCHANT_ARRIVE = 480, MERCHANT_LEAVE = 1080; // minute of day (08:00-18:00)
const NAMES = ["Old Peddler Gu", "Trader Lan", "Merchant Mo Yan", "Peddler Xu", "Madam Rui", "Trader Bai"];
const GREET = ["Fine day for honest trade.", "The road was long, the prices short.", "Look, but do not squint at my scales.", "Bring me something useful and I'll bring you coin."];
const GATHER_METHODS = new Set(["tree_felling", "woodland_collection_or_cut", "quarrying_or_digging", "foraging_or_hand_harvest", "herb_foraging", "fishing", "water_drawing", "plant_grow_harvest"]);
const r2 = v => Math.round(v * 100) / 100;

/** Items the home land cannot supply but cheap facilities need: always stocked. */
function essentials(catalog) {
  if (catalog._essentials) return catalog._essentials;
  const cheap = [...catalog.facilities].sort((a, b) => a.build_requirements.cash_fee_xc - b.build_requirements.cash_fee_xc).slice(0, 40);
  const ids = new Set();
  for (const f of cheap) for (const m of f.build_requirements.materials || []) {
    const it = catalog.itemById.get(m.item_id);
    if (it && !GATHER_METHODS.has(it.acquisition?.method)) ids.add(m.item_id);
  }
  return (catalog._essentials = [...ids]);
}
function pools(catalog) {
  if (catalog._mpools) return catalog._mpools;
  const cat = c => catalog.byCategory[c] || [];
  const cheap = (arr, max) => arr.filter(i => (i.market?.base_price_xc ?? 99) <= max);
  return (catalog._mpools = {
    tools: cheap(cat("tool"), 40), seeds: cheap(cat("seed"), 30), food: cheap(cat("food"), 12), household: cheap(cat("household"), 10),
    producible: [...cat("forage"), ...cat("herb"), ...cat("fish"), ...catalog.items.filter(i => i.category === "raw" && GATHER_METHODS.has(i.acquisition?.method))],
  });
}
function pick(rnd, arr, n) { const a = [...arr], out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; }

export function merchantForDay(catalog, day, state) {
  const rnd = mulberry32(0x4d45 + day * 7919);
  const mod = () => 1 + (rnd() - 0.5) * 0.24; // ±12 %
  const P = pools(catalog);
  const ids = new Set(essentials(catalog));
  for (const g of [pick(rnd, P.tools, 8), pick(rnd, P.seeds, 7), pick(rnd, P.food, 5), pick(rnd, P.household, 4)]) g.forEach(i => ids.add(i.item_id));
  const prices = {}, stock = [];
  for (const id of ids) {
    const p = catalog.price(id); if (!p.shop) continue;
    const price = Math.max(0.1, r2(p.shop * mod()));
    const isEss = essentials(catalog).includes(id);
    stock.push({ item_id: id, price, qty: isEss ? 60 + Math.floor(rnd() * 40) : 3 + Math.floor(rnd() * 8) });
    prices[id] = price;
  }
  stock.sort((a, b) => catalog.itemName(a.item_id).localeCompare(catalog.itemName(b.item_id)));
  const wanted = pick(rnd, P.producible.filter(i => (i.market?.typical_merchant_buyback_price_xc ?? 0) > 0), 5).map(i => {
    const boost = 1.15 + rnd() * 0.2;
    return { item_id: i.item_id, price: r2(catalog.price(i.item_id).buyback * boost), qty: 6 + Math.floor(rnd() * 10), reason: "Wanted today" };
  });
  const wantedMap = new Map(wanted.map(w => [w.item_id, w.price]));
  const buyMod = mod();
  return {
    day, present: true, arriveMin: MERCHANT_ARRIVE, leaveMin: MERCHANT_LEAVE,
    name: NAMES[day % NAMES.length], greeting: GREET[day % GREET.length], stock, wanted,
    buyPrice: id => stock.find(s => s.item_id === id)?.price ?? null, // price player pays
    sellPrice: id => { if (wantedMap.has(id)) return wantedMap.get(id); const b = catalog.price(id).buyback; return b > 0 ? Math.max(0.05, r2(b * buyMod)) : null; }, // price player receives
  };
}
export const merchantHere = minuteOfDay => minuteOfDay >= MERCHANT_ARRIVE && minuteOfDay < MERCHANT_LEAVE;
