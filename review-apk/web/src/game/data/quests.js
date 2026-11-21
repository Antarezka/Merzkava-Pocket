import { mulberry32 } from "../art/paint.js";

export const TUTORIAL = [
  { id: "tut.weeds", type: "clear", target: 3, title: "Clear the Weeds", desc: "Pull 3 patches of weeds from your overgrown field (tap a weed).", reward: { xc: 1, items: [] }, tutorial: true },
  { id: "tut.log", type: "gather", match: "log", target: 1, title: "Chop a Log", desc: "Fell a tree or collect a fallen log with your hatchet.", reward: { xc: 1, items: [] }, tutorial: true },
  { id: "tut.sell", type: "sell", target: 1, title: "First Sale", desc: "Sell anything to the travelling merchant (he visits 08:00–18:00).", reward: { xc: 2, items: [] }, tutorial: true },
];

/** 4 deterministic quests for a sim day. */
export function dailyQuests(catalog, day, state) {
  const rnd = mulberry32(0x9e37 + day * 104729);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const out = [];
  const forage = pick([...catalog.gatherPool("weed"), ...catalog.gatherPool("reed")]);
  const n1 = 4 + Math.floor(rnd() * 4);
  out.push({ id: `d${day}.gather`, type: "gather", item_id: forage.item_id, target: n1, title: `Gather ${forage.name}`, desc: `Collect ${n1} ${forage.name} from the land.`, reward: { xc: Math.ceil(n1 * 0.9), items: [] } });
  const logs = [...catalog.gatherPool("tree"), ...catalog.gatherPool("log")];
  const stone = catalog.gatherPool("rock");
  const raw = pick(rnd() < 0.5 ? logs : stone);
  const n2 = 5 + Math.floor(rnd() * 6);
  out.push({ id: `d${day}.deliver`, type: "deliver", item_id: raw.item_id, target: n2, title: `Steward's Request`, desc: `Deliver ${n2} ${raw.name} to the village steward.`, reward: { xc: Math.ceil(n2 * 1.1), items: [] } });
  const kind = rnd() < 0.5 ? "fish" : "sell";
  if (kind === "fish") out.push({ id: `d${day}.fish`, type: "fish", target: 2, title: "Catch Supper", desc: "Catch 2 fish from the river or pond.", reward: { xc: 4, items: [] } });
  else out.push({ id: `d${day}.sell`, type: "sell", target: 6, title: "Market Day", desc: "Sell 6 items to the merchant.", reward: { xc: 3, items: [] } });
  const herb = pick(catalog.gatherPool("herb"));
  out.push({ id: `d${day}.herb`, type: "gather", item_id: herb.item_id, target: 3, title: `Seek ${herb.name}`, desc: `Gather 3 ${herb.name}.`, reward: { xc: 3, items: [] } });
  return out;
}
