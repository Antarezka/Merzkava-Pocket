// Headless playthrough of the game data layer against the real catalogue.
import fs from "node:fs";
import { buildCatalog } from "../web/src/game/data/catalog.js";
import { createNewState, saveState, loadState, memoryStorage, hasSave, SAVE_VERSION, saveKey } from "../web/src/game/data/state.js";
import { GameEconomy } from "../web/src/game/data/economy.js";
import { dayIndex, minuteOfDay } from "../web/src/game/data/clock.js";

const dir = new URL("../../docs/game/catalogs/", import.meta.url);
const J = n => JSON.parse(fs.readFileSync(new URL(n, dir), "utf8"));
const catalog = buildCatalog({ itemsA: J("POCKET_ECONOMY_ITEMS_001_500.json"), itemsB: J("POCKET_ECONOMY_ITEMS_501_1000.json"), facilities: J("POCKET_FACILITIES_200.json"), recipes: J("POCKET_PRODUCTION_RECIPES.json") });
const results = []; const check = (name, ok, extra = "") => { results.push(ok); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); };
const dev = { role: "developer", displayName: "Dev", identityRef: "dev-1" }, ply = { role: "player", displayName: "Lian" };
const storage = memoryStorage();
const state = createNewState({ identity: dev, name: "Tester", appearance: { gender: "female" }, catalog });
const eco = new GameEconomy(catalog, state, { storage, identity: dev });
const name = id => catalog.itemName(id);

check("catalogue sizes", catalog.items.length === 1000 && catalog.facilities.length === 200 && catalog.recipes.length === 20);
check("starter kit in bag", catalog.starterKit.items.length >= 9 && eco.bagUsed() === catalog.starterKit.items.length, `${eco.bagUsed()} slots`);
check("opening balance 5 xc", eco.wallet() === 5);

eco.devSkipTime(150); // 08:30 so the merchant is present
const dump = () => { for (const { item, qty } of eco.bagList()) if (item.category !== "tool" && eco.sellPriceFor(item.item_id, qty)) eco.sellToMerchant(item.item_id, qty); };
// gather every kind
let gathered = {};
for (const [kind, variant, n] of [["weed", "", 4], ["tree", "pine", 12], ["log", "", 3], ["rock", "", 16], ["boulder", "", 8], ["herb", "", 3], ["reed", "", 3]]) {
  dump(); let ok = 0;
  for (let i = 0; i < n; i++) { const uid = `${kind}-${i}`; const p = eco.planGather({ kind, variant }, { propUid: uid }); if (p.ok && eco.commitGather(p, uid).ok) ok++; }
  gathered[kind] = ok;
}
check("gathering all node kinds works", Object.values(gathered).every(v => v > 0), JSON.stringify(gathered));
dump(); const p = eco.planGather({ kind: "fish" }, { propUid: "f1", water: "river" }); check("fishing plan with rod", p.ok && eco.commitGather(p, "f1").ok);
// a tree depletes by harvest cap
let tree = 0; for (let i = 0; i < 30; i++) { const pl = eco.planGather({ kind: "tree", variant: "pine" }, { propUid: "T" }); if (!pl.ok) break; eco.commitGather(pl, "T"); tree++; }
check("tree depletes at cap", eco.isNodeDepleted("T") && tree <= 10, `${tree} harvests`);
// tutorial progress
check("tutorial counted weeds", eco.state.quests.progress["tut.weeds"] >= 3);
// merchant
const m = eco.merchant(); check("merchant present 08:00+", m.present && m.stock.length >= 24, `${m.stock.length} lines, ${m.wanted.length} wanted`);
dump(); const before = eco.wallet(); let sold = 0;
for (let i = 0; i < 6; i++) { const pl = eco.planGather({ kind: "weed" }, { propUid: "w" + i }); if (pl.ok) eco.commitGather(pl, "w" + i); }
for (const { item, qty } of eco.bagList()) if (item.category !== "tool" && eco.sellPriceFor(item.item_id, qty)) { if (eco.sellToMerchant(item.item_id, qty).ok) sold++; }
check("selling raises wallet", sold > 0 && eco.wallet() > before, `${before} -> ${eco.wallet()}`);
check("player cannot dev", new GameEconomy(catalog, createNewState({ identity: ply, catalog }), {}).devGrant({ xc: 99 }).reason === "forbidden");
// solvability: how much does the Village Well need and can merchant+gathering cover it?
const plan = eco.buildPlan("facility.water.01"); console.log("     well plan missing:", plan.missing.join("; ") || "none");
check("well plan reads catalogue", plan.cost === 22 && plan.materials.length === 4);
eco.devGrant({ xc: 200, items: [{ item_id: "itm.0132", quantity: 20 }, { item_id: "itm.0081", quantity: 12 }] });
const built = eco.placeFacility("facility.water.01", 5, 5, { canPlace: () => true }); check("place Village Well", built.ok, built.missing?.join(";") || "");
eco.devSkipTime(500); check("construction completes after sim time", eco.facilities()[0].status === "ready");
const wp = eco.planGather({ kind: "water" }, { propUid: "well" }); check("draw water with bucket after well", wp.ok && eco.commitGather(wp, "well").ok, wp.missing?.join(";") || "");
eco.devSkipTime(300); const col = eco.collect(eco.facilities()[0].uid); check("well produces water", col.ok, JSON.stringify(col.gained));
// farm
eco.devGrant({ xc: 300, items: [{ item_id: "itm.0132", quantity: 20 }, { item_id: "itm.0081", quantity: 12 }, { item_id: "itm.0641", quantity: 4 }, { item_id: "itm.0699", quantity: 4 }, { item_id: "itm.0351", quantity: 3 }] });
const farm = eco.placeFacility("facility.farm.01", 8, 8, { canPlace: () => true, w: 2, h: 2 }); check("place Farm Plot", farm.ok, farm.missing?.join(";") || "");
eco.devSkipTime(1200);
const pl = eco.plant(farm.uid, "itm.0351", 3); check("plant rice seed", pl.ok, pl.reason || "");
eco.devSkipTime(100); const hv = eco.harvestPlot(farm.uid); check("harvest rice", hv.ok, JSON.stringify(hv));
// recipe
const sawmillRecipes = catalog.recipes.filter(r => r.facility_id === "facility.forestry.03").length; check("explicit recipes exist", sawmillRecipes > 0);
// quests
const q = eco.questList(); check("4 daily + tutorial quests", q.filter(x => !x.tutorial).length === 4);
const claimable = q.find(x => x.done && !x.claimed); if (claimable) check("claim quest", eco.claimQuest(claimable.id).ok);
// save / load
eco.save(); const loaded = loadState(dev, catalog, storage); check("save/load round trip", loaded.ok && JSON.stringify(loaded.state) === JSON.stringify(eco.state));
const s2 = memoryStorage(); s2.setItem(saveKey(dev), JSON.stringify({ ...state, version: SAVE_VERSION + 1 })); check("newer save refused", loadState(dev, catalog, s2).reason === "newer");
check("hasSave", hasSave(dev, storage) && !hasSave(ply, storage));
// no ID/price mutation
check("prices untouched", catalog.price("itm.0001").base === 8);
process.exit(results.every(Boolean) ? 0 : 1);
