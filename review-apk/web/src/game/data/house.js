// House upgrade (level 1-3). Stored in state.flags.house_level; costs use catalogue materials by name so nothing is invented outside the item register.
const LEVELS = [null, null,
  { cash: 60, mats: [["Rough Plank", 20], ["Rope Coil", 8], ["Fieldstone", 12]], minutes: 720, name: "Timber Cottage" },
  { cash: 220, mats: [["Rough Plank", 60], ["Rope Coil", 20], ["Fieldstone", 40]], minutes: 1440, name: "Courtyard Manor" }];
export const houseLevel = (eco) => Math.max(1, Math.min(3, eco.state.flags.house_level || 1));
export function housePlan(eco) {
  const lv = houseLevel(eco), next = LEVELS[lv + 1]; if (!next) return { max: true };
  const cat = eco.catalog, mats = next.mats.map(([n, q]) => { const it = [...cat.itemById.values()].find((i) => i.name === n); return it && { item_id: it.item_id, name: n, quantity: q, have: eco.total(it.item_id) }; }).filter(Boolean);
  const missing = []; if (eco.wallet() + 1e-9 < next.cash) missing.push(`${next.cash} xc (have ${eco.wallet()})`);
  for (const m of mats) if (m.have + 1e-9 < m.quantity) missing.push(`${m.name} ${m.have}/${m.quantity}`);
  return { max: false, level: lv + 1, name: next.name, cash: next.cash, mats, ok: !missing.length, missing };
}
export function upgradeHouse(eco) {
  const p = housePlan(eco); if (p.max) return { ok: false, reason: "max_level" }; if (!p.ok) return { ok: false, reason: "requirements", missing: p.missing };
  for (const m of p.mats) eco._takeTotal(m.item_id, m.quantity); eco._pay(p.cash); eco.state.flags.house_level = p.level; eco.ledger("upgrade", -p.cash, "House → " + p.name); eco.toast("House upgraded: " + p.name); eco.changed(); return { ok: true };
}
