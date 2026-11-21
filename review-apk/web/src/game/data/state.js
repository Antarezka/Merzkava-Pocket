import { makeClock } from "./clock.js";

export const SAVE_VERSION = 1;
export const BAG_SLOTS = 24, STACK = 99, CHEST_SLOTS = 40;

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: k => void m.delete(k) };
}

/** identity = { role:"player"|"developer", displayName, identityRef } */
export function saveKey(identity) {
  const who = identity?.role === "player" ? identity.displayName || "unverified" : identity?.identityRef || identity?.displayName || "local-developer";
  return "mp-game-v1:" + (identity?.role || "developer") + ":" + encodeURIComponent(who);
}
export const hasSave = (identity, storage) => { try { return !!storage.getItem(saveKey(identity)); } catch { return false; } };
export const deleteSave = (identity, storage) => { try { storage.removeItem(saveKey(identity)); return true; } catch { return false; } };

export function createNewState({ identity, name, appearance, catalog, now = Date.now() }) {
  const kit = catalog?.starterKit;
  const bagItems = {}, chestItems = {};
  for (const k of kit?.items || []) bagItems[k.item_id] = (bagItems[k.item_id] || 0) + k.quantity;
  for (const k of kit?.materials || []) chestItems[k.item_id] = (chestItems[k.item_id] || 0) + k.quantity;
  return {
    version: SAVE_VERSION,
    profile: { name: name || identity?.displayName || "Wanderer", role: identity?.role || "developer", created_at: now, appearance },
    clock: makeClock(now),
    wallet_xc: kit?.wallet_xc ?? 5,
    bag: { slots: BAG_SLOTS, items: bagItems },
    storages: { "home-chest": { slots: CHEST_SLOTS, items: chestItems, name: "Home Chest" } },
    facilities: [], nodes: {}, plots: {},
    quests: { day: -1, daily: [], progress: {}, claimed: {}, tutorial: { step: 0, done: false } },
    merchant: { visits: 0 }, flags: { starter_kit_given: true }, ledger: [], durability: {},
    position: null, stats: { gathered: 0, sold: 0, built: 0 },
  };
}

const migrations = {}; // version -> fn(state) -> state at version+1
export function loadState(identity, catalog, storage) {
  let raw; try { raw = storage.getItem(saveKey(identity)); } catch { return { ok: false, reason: "storage" }; }
  if (!raw) return { ok: false, reason: "none" };
  let s; try { s = JSON.parse(raw); } catch { return { ok: false, reason: "corrupt" }; }
  if (!s || typeof s.version !== "number") return { ok: false, reason: "corrupt" };
  if (s.version > SAVE_VERSION) return { ok: false, reason: "newer" };
  try { storage.setItem(saveKey(identity) + ":backup", raw); } catch {}
  while (s.version < SAVE_VERSION) { const m = migrations[s.version]; if (!m) return { ok: false, reason: "migrate" }; s = m(s); }
  return { ok: true, state: s };
}
export function saveState(state, identity, storage) {
  try { storage.setItem(saveKey(identity), JSON.stringify(state)); return true; } catch { return false; }
}
