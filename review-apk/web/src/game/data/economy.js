import { STACK, saveState } from "./state.js";
import { simNow, dayIndex, minuteOfDay, simMinToRealMs, skipSim } from "./clock.js";
import { merchantForDay, merchantHere } from "./merchant.js";
import { TUTORIAL, dailyQuests } from "./quests.js";
import { mulberry32 } from "../art/paint.js";

const r2 = v => Math.round(v * 100) / 100;
const fail = reason => ({ ok: false, reason });
// kind -> [sim minutes per action, max harvests per node, respawn sim minutes override]
const KIND = { tree: [6, null, null], log: [3, 3, 480], stump: [4, 3, 480], rock: [4, 4, 480], boulder: [6, 6, 600], weed: [2, 1, 360], reed: [2, 2, 360], herb: [3, 2, 480], water: [2, Infinity, 0], fish: [6, Infinity, 0] };
const PASSIVE_FAMILIES = new Set(["Water & sanitation", "Forestry & timber", "Stone & mining", "Aquaculture & fishing", "Poultry & livestock", "Apiary & sericulture"]);
const TOOL_USES = 150;

export class GameEconomy {
  constructor(catalog, state, { storage, identity } = {}) {
    this.catalog = catalog; this.state = state; this.storage = storage; this.identity = identity;
    this.handlers = {}; this._m = null; this._uid = state.facilities.reduce((n, f) => Math.max(n, +f.uid.replace(/\D/g, "") || 0), 0);
    this.ensureQuests();
  }
  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); return () => { this.handlers[ev] = this.handlers[ev].filter(x => x !== fn); }; }
  emit(ev, d) { for (const fn of this.handlers[ev] || []) try { fn(d); } catch {} }
  save() { if (this.storage) saveState(this.state, this.identity, this.storage); }
  changed() { this.save(); this.emit("change"); }
  toast(text) { this.emit("toast", text); }
  now() { return simNow(this.state); }
  get isDev() { return this.state.profile.role === "developer"; }

  // ---------- ledger / wallet ----------
  ledger(type, amount, note) { this.state.ledger.unshift({ at: Date.now(), sim: this.now(), type, amount: r2(amount), note }); this.state.ledger.length = Math.min(this.state.ledger.length, 250); }
  wallet() { return this.state.wallet_xc; }
  _pay(a) { this.state.wallet_xc = r2(this.state.wallet_xc - a); }

  // ---------- bag / storage ----------
  qty(id) { return this.state.bag.items[id] || 0; }
  total(id) { let n = this.qty(id); for (const s of Object.values(this.state.storages)) n += s.items[id] || 0; return r2(n); }
  _slots(items) { let n = 0; for (const q of Object.values(items)) if (q > 0) n += Math.ceil(q / STACK); return n; }
  bagUsed() { return this._slots(this.state.bag.items); }
  _canFit(cont, id, n) { const cur = cont.items[id] || 0; return this._slots(cont.items) - (cur > 0 ? Math.ceil(cur / STACK) : 0) + Math.ceil((cur + n) / STACK) <= cont.slots; }
  canAdd(id, n = 1) { return this._canFit(this.state.bag, id, n); }
  _put(cont, id, n) { cont.items[id] = r2((cont.items[id] || 0) + n); }
  _take(cont, id, n) { const left = r2((cont.items[id] || 0) - n); if (left <= 0.0001) delete cont.items[id]; else cont.items[id] = left; }
  addItem(id, n) { if (!(n > 0) || !this.catalog.itemById.has(id)) return fail("invalid"); if (!this.canAdd(id, n)) return fail("bag_full"); this._put(this.state.bag, id, n); return { ok: true }; }
  removeItem(id, n) { if (this.qty(id) + 1e-9 < n) return fail("missing"); this._take(this.state.bag, id, n); return { ok: true }; }
  _takeTotal(id, n) { let need = n; const b = Math.min(need, this.qty(id)); if (b > 0) { this._take(this.state.bag, id, b); need = r2(need - b); } for (const s of Object.values(this.state.storages)) { if (need <= 0) break; const t = Math.min(need, s.items[id] || 0); if (t > 0) { this._take(s, id, t); need = r2(need - t); } } }
  bagList() { return Object.entries(this.state.bag.items).map(([id, qty]) => ({ item: this.catalog.itemById.get(id), qty })).filter(x => x.item).sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name)); }
  storages() { return Object.entries(this.state.storages).map(([uid, s]) => ({ uid, name: s.name, slots: s.slots, used: this._slots(s.items) })); }
  storageList(uid) { const s = this.state.storages[uid]; return s ? Object.entries(s.items).map(([id, qty]) => ({ item: this.catalog.itemById.get(id), qty })).filter(x => x.item).sort((a, b) => a.item.name.localeCompare(b.item.name)) : []; }
  moveToStorage(uid, id, n) { const s = this.state.storages[uid]; if (!s) return fail("no_storage"); n = Math.min(n, this.qty(id)); if (!(n > 0)) return fail("missing"); if (!this._canFit(s, id, n)) return fail("storage_full"); this._take(this.state.bag, id, n); this._put(s, id, n); this.changed(); return { ok: true, moved: n }; }
  moveToBag(uid, id, n) { const s = this.state.storages[uid]; if (!s) return fail("no_storage"); n = Math.min(n, s.items[id] || 0); if (!(n > 0)) return fail("missing"); if (!this.canAdd(id, n)) return fail("bag_full"); this._take(s, id, n); this._put(this.state.bag, id, n); this.changed(); return { ok: true, moved: n }; }
  /** Tool held in bag matching any of the requirement strings. Unknown-only requirements impose no tool. */
  toolFor(reqs) {
    const sets = (reqs || []).map(r => this.catalog.toolMatches(r)).filter(x => x.length);
    if (!sets.length) return { ok: true, tool: null };
    for (const set of sets) for (const id of set) if (this.qty(id) > 0) return { ok: true, tool: id };
    return { ok: false, missing: (reqs || []).filter(r => this.catalog.toolMatches(r).length).join(" / ") };
  }
  _wear(toolId) { if (!toolId) return; const d = this.state.durability; d[toolId] = (d[toolId] ?? TOOL_USES) - 1; if (d[toolId] <= 0) { delete d[toolId]; this._take(this.state.bag, toolId, 1); this.toast(this.catalog.itemName(toolId) + " broke."); } }

  // ---------- gathering ----------
  isNodeDepleted(uid) {
    const n = this.state.nodes[uid]; if (!n || n.respawn_at == null) return false;
    if (this.now() >= n.respawn_at) { delete this.state.nodes[uid]; return false; }
    return true;
  }
  _pickItem(node, uid, ctx) {
    const pool = this.catalog.gatherPool(node.kind, node.variant, ctx.water);
    if (!pool.length) return null;
    const taken = this.state.nodes[uid]?.taken || 0;
    return pool[Math.floor(mulberry32(hashStr(uid + ":" + taken))() * pool.length)];
  }
  planGather(node, ctx = {}) {
    const k = KIND[node?.kind]; if (!k) return fail("not_gatherable");
    const uid = ctx.propUid || "anon";
    if (uid !== "anon" && this.isNodeDepleted(uid)) return fail("depleted");
    const item = this._pickItem(node, uid, ctx); if (!item) return fail("nothing_here");
    const t = this.toolFor(item.acquisition?.tool_requirements);
    const simMinutes = k[0], rate = item.acquisition?.output_per_active_sim_minute?.quantity || 0.2;
    const metric = /kg|g$/i.test(item.unit || "");
    let q = r2(Math.min(4, Math.max(metric ? 0.5 : 1, metric ? Math.round(rate * simMinutes * 2) / 2 : Math.round(rate * simMinutes))));
    const plan = { ok: t.ok, seconds: Math.min(6, Math.max(2, simMinutes * 1.25)), simMinutes, yields: [{ item_id: item.item_id, quantity: q }], tool: t.tool, missing: t.ok ? [] : ["Needs " + t.missing], label: gatherLabel(node.kind), node, item_id: item.item_id, water: ctx.water };
    if (!t.ok) plan.reason = "missing_tool";
    else if (!this.canAdd(item.item_id, q)) { plan.ok = false; plan.reason = "bag_full"; plan.missing = ["Bag is full"]; }
    return plan;
  }
  commitGather(plan, propUid) {
    if (!plan?.ok) return fail(plan?.reason || "invalid");
    const node = plan.node, item = this.catalog.itemById.get(plan.item_id);
    const re = this.planGather(node, { propUid, water: plan.water }); // re-validate tools/bag/depletion
    if (!re.ok) return fail(re.reason);
    const gained = [];
    for (const y of plan.yields) { const r = this.addItem(y.item_id, y.quantity); if (!r.ok) return r; gained.push(y); }
    const n = this.state.nodes[propUid] ||= { taken: 0 };
    n.taken++;
    const k = KIND[node.kind], cap = k[1] ?? item.harvest_cap_per_tree ?? 6;
    if (n.taken >= cap) n.respawn_at = this.now() + (k[2] ?? item.respawn_sim_minutes ?? 240);
    this._wear(plan.tool);
    this.state.stats.gathered += gained.reduce((a, g) => a + g.quantity, 0);
    for (const g of gained) { this.questEvent("gather", { item_id: g.item_id, qty: g.quantity, kind: node.kind }); if (node.kind === "fish") this.questEvent("fish", { qty: 1 }); }
    if (node.kind === "weed") this.questEvent("clear", { qty: 1 });
    this.changed();
    return { ok: true, gained, depleted: this.isNodeDepleted(propUid) };
  }

  // ---------- facilities ----------
  _facReqs(f, upgrade) {
    return upgrade ? { cash: upgrade.cash_fee_xc, materials: upgrade.materials || [], minutes: upgrade.duration_sim_minutes, tools: f.build_requirements.builder_tools || [], builders: f.build_requirements.builders_required || 1 }
      : { cash: f.build_requirements.cash_fee_xc, materials: f.build_requirements.materials || [], minutes: f.construction.duration_sim_minutes, tools: f.build_requirements.builder_tools || [], builders: f.build_requirements.builders_required || 1 };
  }
  _plan(f, req, extraMissing = []) {
    const missing = [...extraMissing];
    const materials = req.materials.map(m => { const have = this.total(m.item_id); if (have + 1e-9 < m.quantity) missing.push(`${m.item_name || this.catalog.itemName(m.item_id)} ${have}/${m.quantity}`); return { item_id: m.item_id, item: this.catalog.itemById.get(m.item_id), need: m.quantity, have }; });
    if (this.state.wallet_xc + 1e-9 < req.cash) missing.push(`${req.cash} xc (have ${this.state.wallet_xc})`);
    for (const t of req.tools) { const ids = this.catalog.toolMatches(t); if (ids.length && !ids.some(id => this.qty(id) > 0)) missing.push("Tool: " + t); }
    return { ok: !missing.length, cost: req.cash, materials, missing, simMinutes: req.minutes, seconds: simMinToRealMs(req.minutes) / 1000 };
  }
  buildPlan(facilityId) {
    const f = this.catalog.facilityById.get(facilityId); if (!f) return fail("unknown");
    const pre = (f.build_requirements.predecessor || []).filter(Boolean);
    const extra = pre.length && !pre.some(p => this.state.facilities.some(x => x.facility_id === p && x.status === "ready")) ? ["Requires " + pre.map(p => this.catalog.facilityById.get(p)?.name || p).join(" / ")] : [];
    return this._plan(f, this._facReqs(f), extra);
  }
  _consume(req) { for (const m of req.materials) this._takeTotal(m.item_id, m.quantity); this._pay(req.cash); }
  placeFacility(facilityId, c, r, ctx = {}) {
    const f = this.catalog.facilityById.get(facilityId); if (!f) return fail("unknown");
    const plan = this.buildPlan(facilityId); if (!plan.ok) return { ok: false, reason: "requirements", missing: plan.missing };
    if (ctx.canPlace && !ctx.canPlace(c, r, ctx.w || 1, ctx.h || 1)) return fail("blocked");
    const req = this._facReqs(f); this._consume(req);
    const uid = "fac" + (++this._uid), sim = this.now();
    this.state.facilities.push({ uid, facility_id: facilityId, c, r, w: ctx.w || 1, h: ctx.h || 1, level: 1, status: "building", finish_sim: sim + req.minutes / req.builders, last_sim: sim, buffer: {}, process: null, out: {} });
    this.ledger("build", -req.cash, f.name); this.state.stats.built++;
    this.changed(); return { ok: true, uid };
  }
  facilities() { const sim = this.now(); return this.state.facilities.map(x => ({ ...x, def: this.catalog.facilityById.get(x.facility_id), remainingSim: x.finish_sim ? Math.max(0, x.finish_sim - sim) : 0 })); }
  _fac(uid) { return this.state.facilities.find(f => f.uid === uid); }
  upgradePlan(uid) {
    const x = this._fac(uid); if (!x) return fail("unknown"); const f = this.catalog.facilityById.get(x.facility_id);
    const up = f.levels?.find(l => l.level === x.level + 1)?.upgrade; if (!up) return fail("max_level");
    if (x.status !== "ready") return fail("busy");
    return this._plan(f, this._facReqs(f, up));
  }
  upgradeFacility(uid) {
    const plan = this.upgradePlan(uid); if (!plan.ok) return plan.reason ? plan : { ok: false, reason: "requirements", missing: plan.missing };
    const x = this._fac(uid), f = this.catalog.facilityById.get(x.facility_id), up = f.levels.find(l => l.level === x.level + 1).upgrade, req = this._facReqs(f, up);
    this._consume(req); x.status = "upgrading"; x.finish_sim = this.now() + req.minutes / req.builders;
    this.ledger("upgrade", -req.cash, f.name); this.changed(); return { ok: true };
  }
  tick() {
    const sim = this.now(); let dirty = false;
    for (const x of this.state.facilities) {
      const f = this.catalog.facilityById.get(x.facility_id);
      if ((x.status === "building" || x.status === "upgrading") && sim >= x.finish_sim) {
        const up = x.status === "upgrading"; x.status = "ready"; x.last_sim = x.finish_sim; if (up) x.level++;
        if (f.family === "Storage & logistics") { const cap = (f.levels?.[x.level - 1]?.capacity || 10) * 4; this.state.storages[x.uid] = { slots: cap, items: this.state.storages[x.uid]?.items || {}, name: f.name }; }
        this.toast(f.name + (up ? " upgraded." : " is ready.")); this.questEvent("build", { qty: 1 }); dirty = true;
      }
      if (x.status === "ready" && PASSIVE_FAMILIES.has(f.family) && f.outputs?.length) {
        const dt = Math.max(0, sim - (x.last_sim ?? sim)); x.last_sim = sim;
        for (const o of f.outputs) { const cap = Math.max(1, Math.ceil(o.quantity_per_sim_minute * 240 * x.level)); const cur = x.buffer[o.item_id] || 0; const next = Math.min(cap, cur + o.quantity_per_sim_minute * dt * (1 + (x.level - 1) * 0.5)); if (next - cur > 0.0001) { x.buffer[o.item_id] = r2(next); dirty = true; } }
      }
      if (x.process && !x.process.done && sim >= x.process.finish_sim) { x.process.done = true; dirty = true; this.toast("Production finished at " + f.name); }
    }
    for (const p of Object.values(this.state.plots)) if (p && !p.ready && sim >= p.ready_sim) { p.ready = true; dirty = true; }
    if (this.ensureQuests()) dirty = true;
    if (dirty) this.changed();
    return dirty;
  }
  /** Collect passive buffer + finished recipe output into the bag (partial if the bag fills). */
  collect(uid) {
    const x = this._fac(uid); if (!x) return fail("unknown"); const gained = [];
    const give = (id, q) => { q = r2(q); while (q > 0.0001 && !this.canAdd(id, q)) q = r2(Math.floor(q) > 0 && Math.floor(q) < q ? Math.floor(q) : q - 1); if (q > 0) { this.addItem(id, q); gained.push({ item_id: id, quantity: q }); } return q; };
    for (const [id, q] of Object.entries(x.buffer)) { const got = give(id, q); const left = r2(q - got); if (left <= 0.0001) delete x.buffer[id]; else x.buffer[id] = left; }
    if (x.process?.done) { const rc = this.catalog.recipeById.get(x.process.recipe_id); let all = true; for (const o of rc.outputs) { const want = o.quantity * x.process.times, got = give(o.item_id, want); if (got + 1e-9 < want) all = false; } if (all) x.process = null; }
    if (!gained.length) return fail("nothing_to_collect");
    this.changed(); return { ok: true, gained };
  }
  recipesFor(uid) {
    const x = this._fac(uid); if (!x || x.status !== "ready") return [];
    return this.catalog.recipes.filter(r => r.facility_id === x.facility_id).map(recipe => {
      const missing = []; for (const i of recipe.inputs) { const have = this.total(i.item_id); if (have + 1e-9 < i.quantity) missing.push(`${i.item_name} ${have}/${i.quantity}`); }
      for (const t of recipe.tool_requirements || []) { const ids = this.catalog.toolMatches(t); if (ids.length && !ids.some(id => this.qty(id) > 0)) missing.push("Tool: " + t); }
      if (x.process) missing.push("Station busy");
      return { recipe, canRun: !missing.length, missing };
    });
  }
  startRecipe(uid, recipeId, times = 1) {
    const x = this._fac(uid), rc = this.catalog.recipeById.get(recipeId); if (!x || !rc || x.status !== "ready" || rc.facility_id !== x.facility_id) return fail("invalid");
    if (x.process) return fail("busy"); times = Math.max(1, Math.floor(times));
    for (const i of rc.inputs) if (this.total(i.item_id) + 1e-9 < i.quantity * times) return fail("missing_inputs");
    for (const i of rc.inputs) this._takeTotal(i.item_id, i.quantity * times);
    x.process = { recipe_id: recipeId, times, finish_sim: this.now() + rc.active_process_sim_minutes * times, done: false };
    this.changed(); return { ok: true };
  }
  // ---------- farming ----------
  plant(uid, seedId, n = 1) {
    const x = this._fac(uid); if (!x || x.status !== "ready") return fail("invalid");
    const f = this.catalog.facilityById.get(x.facility_id); if (f.family !== "Farming & horticulture") return fail("not_farm");
    const info = this.catalog.cropInfo(seedId); if (!info || info.seed !== seedId) return fail("not_seed");
    if (this.state.plots[uid]) return fail("planted");
    const cap = f.levels?.[x.level - 1]?.capacity || 10; n = Math.min(n, cap, this.qty(seedId)); if (n < 1) return fail("no_seed");
    for (const t of ["Hoe", "Watering Can"]) if (!this.catalog.toolMatches(t).some(id => this.qty(id) > 0)) return { ok: false, reason: "missing_tool", missing: [t] };
    this._take(this.state.bag, seedId, n);
    this.state.plots[uid] = { seed: seedId, crop: info.crop, n, ready_sim: this.now() + info.growSimMin, ready: false };
    this.changed(); return { ok: true, n, seconds: simMinToRealMs(info.growSimMin) / 1000 };
  }
  harvestPlot(uid) {
    const p = this.state.plots[uid]; if (!p) return fail("empty"); if (!p.ready && this.now() < p.ready_sim) return fail("growing");
    const info = this.catalog.cropInfo(p.crop), q = r2(p.n * (info?.yield || 1));
    if (!this.addItem(p.crop, q).ok) return fail("bag_full");
    delete this.state.plots[uid]; this.questEvent("harvest", { qty: q }); this.changed(); return { ok: true, item_id: p.crop, quantity: q };
  }
  // ---------- merchant ----------
  merchant() {
    const sim = this.now(), day = dayIndex(sim), min = minuteOfDay(sim);
    if (!this._m || this._m.day !== day) this._m = merchantForDay(this.catalog, day, this.state);
    const ms = this.state.merchant; if (ms.day !== day) { ms.day = day; ms.bought = {}; ms.soldWanted = {}; }
    return Object.assign(this._m, { present: merchantHere(min), minuteOfDay: min });
  }
  buyFromMerchant(id, qty = 1) {
    const m = this.merchant(); if (!m.present) return fail("merchant_away");
    const line = m.stock.find(s => s.item_id === id); if (!line) return fail("not_stocked");
    const left = line.qty - (this.state.merchant.bought[id] || 0); if (qty > left) return fail("out_of_stock");
    const cost = r2(line.price * qty); if (cost > this.state.wallet_xc + 1e-9) return fail("no_funds");
    if (!this.canAdd(id, qty)) return fail("bag_full");
    this._pay(cost); this._put(this.state.bag, id, qty); this.state.merchant.bought[id] = (this.state.merchant.bought[id] || 0) + qty;
    this.ledger("buy", -cost, `${qty}× ${this.catalog.itemName(id)}`); this.changed(); return { ok: true, cost };
  }
  sellPriceFor(id, qty = 1) {
    const m = this.merchant(), w = m.wanted.find(x => x.item_id === id), base = m.sellPrice(id); if (base == null) return null;
    if (!w) return r2(base * qty);
    const prem = Math.max(0, Math.min(qty, w.qty - (this.state.merchant.soldWanted[id] || 0)));
    return r2(prem * w.price + (qty - prem) * this.catalog.price(id).buyback);
  }
  sellToMerchant(id, qty = 1) {
    const m = this.merchant(); if (!m.present) return fail("merchant_away");
    qty = Math.min(qty, this.qty(id)); if (!(qty > 0)) return fail("missing");
    const gain = this.sellPriceFor(id, qty); if (gain == null) return fail("not_wanted");
    const w = m.wanted.find(x => x.item_id === id); if (w) this.state.merchant.soldWanted[id] = (this.state.merchant.soldWanted[id] || 0) + qty;
    this._take(this.state.bag, id, qty); this.state.wallet_xc = r2(this.state.wallet_xc + gain);
    this.ledger("sell", gain, `${qty}× ${this.catalog.itemName(id)}`); this.state.stats.sold += qty;
    this.questEvent("sell", { qty, value: gain }); this.changed(); return { ok: true, gain };
  }
  // ---------- quests ----------
  ensureQuests() {
    const day = dayIndex(this.now()), q = this.state.quests;
    if (q.day === day) return false;
    q.day = day; q.daily = dailyQuests(this.catalog, day, this.state); q.progress = {}; q.claimed = {}; return true;
  }
  tutorialQuest() { const t = this.state.quests.tutorial; return t.done ? null : TUTORIAL[t.step] || null; }
  questList() {
    this.ensureQuests(); const q = this.state.quests, out = [];
    const tq = this.tutorialQuest(); if (tq) out.push(tq);
    out.push(...q.daily);
    return out.map(x => { const p = Math.min(x.target, q.progress[x.id] || 0); return { ...x, progress: p, done: p >= x.target, claimed: !!q.claimed[x.id] }; });
  }
  questEvent(type, p = {}) {
    const q = this.state.quests; let hit = false;
    for (const x of [this.tutorialQuest(), ...q.daily].filter(Boolean)) {
      if (q.claimed[x.id]) continue; let add = 0;
      if (x.type === type) {
        if (type === "gather") { if (x.item_id ? x.item_id === p.item_id : x.match ? ["log", "tree", "stump"].includes(p.kind) : true) add = p.qty || 1; }
        else add = p.qty || 1;
      }
      if (add > 0) { q.progress[x.id] = Math.min(x.target, (q.progress[x.id] || 0) + add); hit = true; }
    }
    if (hit) this.emit("quest");
  }
  deliverQuest(id) {
    const x = this.state.quests.daily.find(d => d.id === id); if (!x || x.type !== "deliver") return fail("invalid");
    const need = x.target - (this.state.quests.progress[id] || 0); if (need <= 0) return fail("done");
    const give = Math.min(need, this.total(x.item_id)); if (give < 1) return fail("missing");
    this._takeTotal(x.item_id, give); this.state.quests.progress[id] = (this.state.quests.progress[id] || 0) + give; this.emit("quest"); this.changed(); return { ok: true, delivered: give };
  }
  claimQuest(id) {
    const x = this.questList().find(q => q.id === id); if (!x || !x.done || x.claimed) return fail("not_ready");
    for (const it of x.reward.items || []) if (!this.canAdd(it.item_id, it.quantity)) return fail("bag_full");
    this.state.wallet_xc = r2(this.state.wallet_xc + (x.reward.xc || 0)); for (const it of x.reward.items || []) this.addItem(it.item_id, it.quantity);
    this.state.quests.claimed[id] = true; this.ledger("quest", x.reward.xc || 0, x.title);
    if (x.tutorial) { const t = this.state.quests.tutorial; t.step++; if (t.step >= TUTORIAL.length) t.done = true; }
    this.emit("quest"); this.changed(); return { ok: true, reward: x.reward };
  }
  // ---------- developer ----------
  devGrant({ xc = 0, items = [] } = {}) {
    if (!this.isDev) return fail("forbidden");
    this.state.wallet_xc = r2(this.state.wallet_xc + xc); for (const i of items) this.addItem(i.item_id, i.quantity);
    this.ledger("dev", xc, "developer grant"); this.changed(); return { ok: true };
  }
  devSkipTime(simMin) { if (!this.isDev) return fail("forbidden"); skipSim(this.state, simMin); this.tick(); return { ok: true }; }
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function gatherLabel(kind) { return { tree: "Fell tree", log: "Collect log", stump: "Dig stump", rock: "Quarry stone", boulder: "Break boulder", weed: "Pull weeds", reed: "Cut reeds", herb: "Pick herbs", water: "Draw water", fish: "Fish" }[kind] || "Gather"; }
