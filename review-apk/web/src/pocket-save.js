// Pocket account-level save helpers: Daily Login rewards (daily calendar + hourly kitchen gift),
// the Player-record handoff snapshot and the local reset/rollback helpers.
// This module replaces the retired legacy economy runtime. It knows nothing about the old Home Base/Economy game.
// Rewards are delivered into a small "inbox" that the RPG drains when it opens, so Daily Login stays a separate Pocket feature.
import { rewardPool } from "./game/data/items.js";

const POCKET_DAY_MS = 86400000, HOURLY_GIFT_MS = 3600000, HOURLY_GIFT_YEAR_MS = 365 * 24 * HOURLY_GIFT_MS;
const STATE_VERSION = 1;
const LEGACY_PREFIX = "mp-economy-v1:";        // retired economy save: only read once to keep Daily Login progress, never written
const REWARD_PREFIX = "mp-pocket-rewards-v1:";
const GAME_PREFIX = "mp-game-v1:";              // the RPG's own save (see game/data/state.js)
const rewardSessions = new Map();
let giftRuntime = null;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const uid = () => globalThis.crypto?.randomUUID?.() || ("pocket-" + Date.now() + "-" + Math.random().toString(36).slice(2));
const ownerOf = identity => (identity?.role === "player"
  ? ["player", identity.displayName || "unverified-character"].join(":")
  : ["developer", identity?.identityRef || identity?.displayName || "local-developer"].join(":"));
const rewardKey = identity => REWARD_PREFIX + encodeURIComponent(ownerOf(identity));
const legacyKey = identity => LEGACY_PREFIX + encodeURIComponent(ownerOf(identity));
const gameKey = identity => GAME_PREFIX + (identity?.role === "player" ? "player" : "developer") + ":" +
  encodeURIComponent(identity?.role === "player" ? identity.displayName || "unverified" : identity?.identityRef || identity?.displayName || "local-developer");

function randomSeed() {
  try { const v = new Uint32Array(1); crypto.getRandomValues(v); return v[0] || 0x6d65727a; }
  catch { return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0; }
}
function localDayStart(timestamp = Date.now()) { const d = new Date(timestamp); d.setHours(0, 0, 0, 0); return d.getTime(); }
function readJson(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }

function ensureRewardState(state) {
  const now = Date.now(), d = state.daily_login_rewards, h = state.hourly_gifts;
  if (!d || typeof d !== "object" || Array.isArray(d)) state.daily_login_rewards = { start_day_ms: localDayStart(now), seed: randomSeed(), claimed_days: [] };
  else {
    d.start_day_ms = Number.isFinite(Number(d.start_day_ms)) ? Number(d.start_day_ms) : localDayStart(now);
    d.seed = Number(d.seed) >>> 0 || randomSeed();
    d.claimed_days = Array.isArray(d.claimed_days) ? [...new Set(d.claimed_days.map(Number).filter(x => Number.isInteger(x) && x >= 1 && x <= 1000))] : [];
  }
  if (!h || typeof h !== "object" || Array.isArray(h)) state.hourly_gifts = { total_active_ms: 0, claimed_cycles: 0, seed: randomSeed() };
  else {
    h.total_active_ms = Math.min(HOURLY_GIFT_YEAR_MS, Math.max(0, Number(h.total_active_ms) || 0));
    h.claimed_cycles = Math.max(0, Math.floor(Number(h.claimed_cycles) || 0));
    h.seed = Number(h.seed) >>> 0 || randomSeed();
  }
  if (!Array.isArray(state.inbox)) state.inbox = [];
  if (!Array.isArray(state.ledger)) state.ledger = [];
}
function createState() { return { version: STATE_VERSION, wallet_xc: 0, inbox: [], ledger: [], save_meta: { created_at: Date.now(), updated_at: Date.now() } }; }
function openState(identity) {
  const key = rewardKey(identity);
  let state = readJson(key);
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    state = createState();
    const legacy = readJson(legacyKey(identity));     // keep the player's existing Daily Login progress, nothing else is carried over
    if (legacy?.daily_login_rewards) state.daily_login_rewards = legacy.daily_login_rewards;
    if (legacy?.hourly_gifts) state.hourly_gifts = legacy.hourly_gifts;
  }
  state.version = STATE_VERSION;
  ensureRewardState(state);
  return { key, state };
}
function saveState(state, key) {
  try { state.save_meta = { ...(state.save_meta || {}), updated_at: Date.now() }; localStorage.setItem(key, JSON.stringify(state)); return true; }
  catch { return false; }
}

function rewardRoll(seed, index, channel = 0) {
  let v = (Number(seed) ^ Math.imul(Number(index) + 1, 0x9e3779b1) ^ Math.imul(Number(channel) + 1, 0x85ebca6b)) >>> 0;
  v ^= v >>> 16; v = Math.imul(v, 0x7feb352d) >>> 0; v ^= v >>> 15; v = Math.imul(v, 0x846ca68b) >>> 0; v ^= v >>> 16;
  return (v >>> 0) / 4294967296;
}
function makePocketReward(seed, index, hourly = false) {
  if (rewardRoll(seed, index, hourly ? 2 : 1) < (hourly ? 0.56 : 0.30)) {
    const values = hourly ? [4, 6, 9, 12, 18, 25, 35, 45] : [20, 35, 50, 75, 100, 150, 220, 350, 500, 750];
    return { kind: "currency", amount_xc: values[Math.floor(rewardRoll(seed, index, 3) * values.length)] };
  }
  const pool = rewardPool();
  if (!pool.length) return { kind: "currency", amount_xc: hourly ? 12 : 75 };
  const item = pool[Math.floor(rewardRoll(seed, index, 4) * pool.length)];
  return { kind: "item", item_id: item.item_id, quantity: 1 + Math.floor(rewardRoll(seed, index, 5) * (hourly ? 2 : 6)) };
}
function describeReward(reward) {
  if (!reward) return "Unlisted reward";
  if (reward.kind === "currency") return reward.amount_xc + " xc";
  const item = rewardPool().find(x => x.item_id === reward.item_id);
  return (reward.quantity || 1) + " × " + (item?.name || reward.item_id);
}
function award(state, reward, label, type) {
  if (reward.kind === "currency") state.inbox.push({ id: uid(), at: Date.now(), kind: "currency", amount_xc: Math.max(0, num(reward.amount_xc)), label });
  else if (reward.kind === "item" && reward.item_id) state.inbox.push({ id: uid(), at: Date.now(), kind: "item", item_id: reward.item_id, quantity: Math.max(1, num(reward.quantity)), label });
  else return false;
  state.ledger.unshift({ transaction_id: uid(), at: Date.now(), type, label, reward_kind: reward.kind });
  state.ledger = state.ledger.slice(0, 250);
  return true;
}

export async function openPocketGiftSession(identity) {
  if (!identity?.role) throw new Error("An active Pocket identity is required for reward records.");
  const { key, state: first } = openState(identity), cached = rewardSessions.get(key);
  if (cached) return cached;
  let state = first;
  const refreshLatest = () => { const fresh = openState(identity).state; fresh.daily_login_rewards = state.daily_login_rewards; fresh.hourly_gifts = state.hourly_gifts; state = fresh; };
  const persist = () => saveState(state, key);
  const currentDay = () => Math.max(1, Math.floor((localDayStart() - state.daily_login_rewards.start_day_ms) / POCKET_DAY_MS) + 1);
  const dayDate = day => { const d = new Date(state.daily_login_rewards.start_day_ms); d.setDate(d.getDate() + Math.max(0, Number(day) - 1)); return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); };
  const dailyReward = day => makePocketReward(state.daily_login_rewards.seed, day, false);
  const hourlyEarned = () => Math.min(365 * 24, Math.floor(state.hourly_gifts.total_active_ms / HOURLY_GIFT_MS));
  const hourlyPending = () => Math.max(0, hourlyEarned() - state.hourly_gifts.claimed_cycles);
  const snapshot = () => {
    const today = currentDay(), elapsed = Math.min(HOURLY_GIFT_YEAR_MS, state.hourly_gifts.total_active_ms);
    return {
      current_day: Math.min(1000, today), day_date: dayDate(Math.min(1000, today)), daily_complete: today > 1000,
      daily_claimed: state.daily_login_rewards.claimed_days.includes(today), daily_reward: today <= 1000 ? dailyReward(today) : null,
      hourly_total_active_ms: elapsed, hourly_remaining_ms: elapsed >= HOURLY_GIFT_YEAR_MS ? 0 : HOURLY_GIFT_MS - (elapsed % HOURLY_GIFT_MS),
      hourly_pending: hourlyPending(), hourly_claimed_cycles: state.hourly_gifts.claimed_cycles,
      hourly_complete: elapsed >= HOURLY_GIFT_YEAR_MS && hourlyPending() === 0,
      hourly_next_reward: elapsed < HOURLY_GIFT_YEAR_MS ? makePocketReward(state.hourly_gifts.seed, state.hourly_gifts.claimed_cycles + 1, true) : null
    };
  };
  const session = {
    key, snapshot,
    getStoredFields: () => ({ daily_login_rewards: { ...state.daily_login_rewards, claimed_days: [...state.daily_login_rewards.claimed_days] }, hourly_gifts: { ...state.hourly_gifts } }),
    getDailyReward: dailyReward, getDayDate: dayDate,
    getDailyClaimed: day => state.daily_login_rewards.claimed_days.includes(Number(day)),
    describeReward,
    claimDaily(day) {
      refreshLatest();
      const today = currentDay();
      if (today > 1000 || Number(day) !== today) return { ok: false, message: "Only today's scheduled reward can be claimed." };
      if (state.daily_login_rewards.claimed_days.includes(today)) return { ok: false, message: "Today's reward has already been claimed." };
      const reward = dailyReward(today);
      if (!award(state, reward, "Daily Login · Day " + today, "daily_login_reward")) return { ok: false, message: "This reward record is invalid." };
      state.daily_login_rewards.claimed_days.push(today); persist();
      return { ok: true, reward, label: describeReward(reward), snapshot: snapshot() };
    },
    claimHourly() {
      refreshLatest();
      const earned = hourlyEarned(), cycle = state.hourly_gifts.claimed_cycles + 1;
      if (cycle > earned) return { ok: false, message: "The next hourly gift is not ready yet." };
      const reward = makePocketReward(state.hourly_gifts.seed, cycle, true);
      if (!award(state, reward, "Hourly Kitchen Gift · " + cycle, "hourly_login_reward")) return { ok: false, message: "This hourly reward record is invalid." };
      state.hourly_gifts.claimed_cycles = cycle; persist();
      return { ok: true, reward, label: describeReward(reward), snapshot: snapshot() };
    },
    advanceActiveTime(ms) { state.hourly_gifts.total_active_ms = Math.min(HOURLY_GIFT_YEAR_MS, state.hourly_gifts.total_active_ms + Math.max(0, Number(ms) || 0)); return snapshot(); },
    persist() { refreshLatest(); return persist(); }
  };
  rewardSessions.set(key, session);
  persist();
  return session;
}
export async function startPocketGiftRuntime(identity) {
  const session = await openPocketGiftSession(identity);
  if (giftRuntime?.key === session.key) return session;
  stopPocketGiftRuntime();
  let lastTickAt = Date.now(), lastPersistAt = lastTickAt;
  const tick = () => {
    const now = Date.now(), delta = Math.max(0, now - lastTickAt); lastTickAt = now;
    if (delta) session.advanceActiveTime(delta);
    if (now - lastPersistAt >= 1000) { session.persist(); lastPersistAt = now; }
    window.dispatchEvent(new CustomEvent("pocket:hourly-gift-update", { detail: session.snapshot() }));
  };
  const pageHide = () => { tick(); session.persist(); };
  const interval = window.setInterval(tick, 1000);
  window.addEventListener("pagehide", pageHide);
  giftRuntime = { key: session.key, interval, pageHide, tick, session };
  return session;
}
export function stopPocketGiftRuntime() {
  if (!giftRuntime) return;
  giftRuntime.tick(); window.clearInterval(giftRuntime.interval); window.removeEventListener("pagehide", giftRuntime.pageHide);
  giftRuntime.session.persist(); giftRuntime = null;
}

/** Take (and clear) the reward parcels Daily Login has queued for this identity. Called by the RPG when it opens. */
export function drainPocketRewardInbox(identity) {
  const { key, state } = openState(identity);
  const parcels = state.inbox.splice(0, state.inbox.length);
  if (parcels.length) saveState(state, key);
  return parcels;
}

// ---- Player-record handoff (save code) ---------------------------------------------------------------------------------------------
const nameKeys = name => {
  const clean = String(name || "").trim();
  if (!clean || clean.length > 80) throw new Error("A valid Player name is required.");
  const who = encodeURIComponent(["player", clean].join(":"));
  return { exact: [REWARD_PREFIX + who, LEGACY_PREFIX + who, GAME_PREFIX + "player:" + encodeURIComponent(clean)], prefixes: [REWARD_PREFIX + who + ":", LEGACY_PREFIX + who + ":backup:", GAME_PREFIX + "player:" + encodeURIComponent(clean) + ":"] };
};
const matches = (k, set) => set.exact.includes(k) || set.prefixes.some(p => String(k || "").startsWith(p));
export function capturePocketSaveForPlayerName(playerName) {
  const set = nameKeys(playerName), entries = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (matches(k, set)) { const v = localStorage.getItem(k); if (v !== null) entries.push([k, v]); } } }
  catch (e) { throw new Error("Pocket could not prepare a safe local reset: " + (e instanceof Error ? e.message : "storage unavailable")); }
  return entries;
}
export function restorePocketSaveForPlayerName(playerName, entries) {
  const set = nameKeys(playerName);
  if (!Array.isArray(entries)) throw new Error("The local Player save rollback data is invalid.");
  try { for (const e of entries) if (Array.isArray(e) && e.length === 2 && matches(String(e[0] || ""), set)) localStorage.setItem(String(e[0]), String(e[1])); }
  catch (e) { throw new Error("Pocket could not restore the pre-reset local save: " + (e instanceof Error ? e.message : "storage unavailable")); }
}
export function resetPocketSaveForPlayerName(playerName) {
  const set = nameKeys(playerName); let removed = 0;
  try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (matches(k, set)) { localStorage.removeItem(k); removed++; } } }
  catch (e) { throw new Error("Pocket could not clear the local game save: " + (e instanceof Error ? e.message : "storage unavailable")); }
  return removed;
}
/**
 * Snapshot attached to the Player profile / save code. The container keeps the field names the native profile store validates
 * (inventory, facilities, processes, ledger, save_meta); `rpg` carries the complete Game Mode save.
 */
export function exportPocketSaveSnapshot(identity) {
  if (identity?.role !== "player" || !String(identity.displayName || "").trim()) throw new Error("Only a verified Player session can export its local save.");
  const rewards = openState(identity).state, game = readJson(gameKey(identity));
  const inventory = {};
  for (const [id, n] of Object.entries(game?.bag?.items || {})) inventory[id] = (inventory[id] || 0) + num(n);
  for (const st of Object.values(game?.storages || {})) for (const [id, n] of Object.entries(st?.items || {})) inventory[id] = (inventory[id] || 0) + num(n);
  const facilities = {}; for (const f of game?.facilities || []) if (f?.id || f?.facility_id) facilities[f.id || f.facility_id] = f;
  return {
    format: "MERZKAVA_POCKET_ECONOMY_STATE_V1", schemaVersion: 6, playerName: String(identity.displayName).trim(), exportedAt: Date.now(),
    state: {
      version: STATE_VERSION, wallet_xc: num(game?.wallet_xc), inventory, facilities, processes: [], ledger: (game?.ledger || []).slice(0, 250),
      save_meta: { ...(game?.save_meta || {}), created_at: game?.profile?.created_at || Date.now(), updated_at: Date.now() },
      daily_login_rewards: rewards.daily_login_rewards, hourly_gifts: rewards.hourly_gifts, reward_inbox: rewards.inbox, rpg: game || null
    }
  };
}
