// Bot automation: three quick-use slots (HP / Qi / Meal), the "Auto Draw" refill and the rules that drive them (the AUTOMATION menu).
// This is separate from the AUTO combat button: that one hunts, this one keeps the hero supplied while it does.
// Items in the catalogue carry no numeric effects, so the potion table below is mine (by item id).  Everything is stored in eco.state.flags.auto.
import { cult, gateOf, foodCount, satOf, eat } from "./data/realms.js";
import { getHero } from "./data/mobs.js";
import { statsOf } from "./data/progression.js";
import { SKILL, skillRec, setAuto } from "./data/skills.js";
import { uiIcon } from "./art/icons.js";

export const KINDS = [{ id: "hp", label: "HP", full: "HP potion", col: "#ff5a5a", ic: "hp", unit: "HP", def: 45 }, { id: "qi", label: "QI", full: "Qi recovery", col: "#4aa3ff", ic: "qi", unit: "Qi", def: 25 }, { id: "meal", label: "MEAL", full: "Meal", col: "#ffb02e", ic: "meal", unit: "Satiety", def: 30 }];
// fraction of max HP / Qi restored per use: the item's own `effect` ({ hp } / { qi }) in data/items.js; food = its Satiety value + a little HP
const CD = { hp: 6, qi: 8, meal: 15 };                      // seconds between automatic uses of the same kind

export function autoRec(eco) {
  const a = (eco.state.flags.auto ||= {}); a.slots ||= { hp: null, qi: null, meal: null }; a.th ||= { hp: 45, qi: 25, meal: 30 }; a.refill ??= true; a.prio ||= "low"; a.reserve ??= 6; a.stopFull ??= false; return a;
}
export const effectOf = (item, kind) => (kind === "hp" ? item.effect?.hp || 0 : kind === "qi" ? item.effect?.qi || 0 : item.category === "food" ? satOf(item) : 0);
export function describeItem(item, kind) { const e = effectOf(item, kind); return kind === "meal" ? `+${e} Satiety` : kind === "hp" ? `+${Math.round(e * 100)}% HP` : `+${Math.round(e * 100)}% Qi`; }
/** what in the bag can go into a slot of this kind, best-first according to the priority rule */
export function candidates(eco, kind) {
  const a = autoRec(eco), list = eco.bagList().filter((x) => x.qty >= 1 && effectOf(x.item, kind) > 0); const key = a.prio === "high" ? (x) => -effectOf(x.item, kind) : a.prio === "stock" ? (x) => -x.qty : (x) => effectOf(x.item, kind);
  return list.sort((p, q) => key(p) - key(q));
}
export function slotInfo(eco, kind) { const id = autoRec(eco).slots[kind], item = id ? eco.catalog.itemById.get(id) : null; return { item, qty: item ? Math.floor(eco.qty(item.item_id)) : 0 }; }
/** fill every slot that is empty or has run out from the bag; returns what changed */
export function drawSlots(eco, kinds = KINDS.map((k) => k.id)) {
  const a = autoRec(eco), out = []; for (const k of kinds) { const cur = slotInfo(eco, k); if (cur.item && cur.qty >= 1) continue; const best = candidates(eco, k)[0]; if (!best) { if (cur.item && cur.qty < 1) { a.slots[k] = null; } continue; } a.slots[k] = best.item.item_id; out.push({ kind: k, item: best.item, qty: best.qty }); }
  if (out.length) eco.changed?.(); return out;
}
/** use one item from a slot.  returns { ok, reason, name, gain } */
export function useSlot(eco, kind) {
  const a = autoRec(eco), hero = getHero(eco), st = statsOf(eco); let cur = slotInfo(eco, kind);
  if (!cur.item || cur.qty < 1) { if (a.refill) { drawSlots(eco, [kind]); cur = slotInfo(eco, kind); } if (!cur.item || cur.qty < 1) return { ok: false, reason: "empty" }; }
  const it = cur.item, e = effectOf(it, kind);
  if (kind === "hp") { if (hero.hp >= st.maxHp - 0.5) return { ok: false, reason: "full" }; if (!eco.removeItem(it.item_id, 1).ok) return { ok: false, reason: "empty" }; const g = Math.round(st.maxHp * e); hero.hp = Math.min(st.maxHp, hero.hp + g); return { ok: true, name: it.name, gain: g, kind }; }
  if (kind === "qi") { const q = hero.qi ?? st.qiCap; if (q >= st.qiCap - 0.5) return { ok: false, reason: "full" }; if (!eco.removeItem(it.item_id, 1).ok) return { ok: false, reason: "empty" }; const g = Math.round(st.qiCap * e); hero.qi = Math.min(st.qiCap, q + g); return { ok: true, name: it.name, gain: g, kind }; }
  const r = eat(eco, it.item_id); if (!r.ok) return { ok: false, reason: r.reason === "full" ? "full" : "empty" }; const g = Math.round(st.maxHp * 0.03); hero.hp = Math.min(st.maxHp, hero.hp + g); return { ok: true, name: it.name, gain: e, kind };
}
/** the automatic part: called a few times a second while the bot is hunting.  cd = per-kind countdown seconds (owned by the caller) */
export function tickAuto(eco, cd, dt, notify) {
  const a = autoRec(eco), hero = getHero(eco), st = statsOf(eco), c = cult(eco);
  for (const k of KINDS) {
    cd[k.id] = Math.max(0, (cd[k.id] || 0) - dt); if (cd[k.id] > 0) continue;
    const pct = k.id === "hp" ? hero.hp / st.maxHp * 100 : k.id === "qi" ? (hero.qi ?? st.qiCap) / st.qiCap * 100 : c.sat; if (pct >= a.th[k.id]) continue;
    if (k.id === "meal" && gateOf(eco) && foodCount(eco) <= a.reserve && c.sat > 8) continue;      // keep the food you need for the absorption
    const cur = slotInfo(eco, k.id); if ((!cur.item || cur.qty < 1) && !a.refill) continue;
    const r = useSlot(eco, k.id); cd[k.id] = r.ok ? CD[k.id] : 3; if (r.ok) notify?.(k, r);
  }
}

// ---------------------------------------------------------------------------------------------- the AUTOMATION menu
export function installAutomation({ api, h, open, audio, eco, getEngine, cat }) {
  let pick = null;   // which slot's item picker is open
  const toggle = (get, set) => { const b = h("button", { class: "gs-toggle" + (get() ? " on" : ""), onclick: () => { set(!get()); b.classList.toggle("on", get()); audio.tap(); eco.changed?.(); } }); return b; };
  const seg = (list, get, set, redraw) => h("div", { class: "gs-seg" }, list.map(([v, l]) => h("button", { class: get() === v ? "on" : "", onclick: () => { set(v); audio.tap(); eco.changed?.(); redraw(); } }, l)));
  const row = (t, s, c) => h("div", { class: "gs-row" }, h("div", null, h("b", null, t), s ? h("small", null, s) : null), c);
  api.autoDraw = () => { const out = drawSlots(eco); const e = getEngine(); if (out.length) { audio.ok?.(); api.toast("Auto Draw — " + out.map((o) => `${KINDS.find((k) => k.id === o.kind).label}: ${o.item.name} ×${Math.floor(o.qty)}`).join(" · ")); e?.grind?.drawFx?.(); } else { audio.no?.(); const empty = KINDS.some((k) => { const s = slotInfo(eco, k.id); return !s.item || s.qty < 1; }); api.toast(empty ? "Nothing in your bag fits the empty slots." : "All quick slots are stocked."); } api.frame?.(); return out; };
  api.autoUse = (kind) => { const g = getEngine()?.grind; const r = g ? g.useItem(kind, true) : useSlot(eco, kind); if (!r.ok) { audio.no?.(); api.toast(r.reason === "empty" ? (autoRec(eco).refill ? "Nothing left to draw from your bag." : "Slot is empty — tap AUTO DRAW.") : r.reason === "full" ? "Already full." : "Can't use that now."); } api.frame?.(); return r; };
  api.openAuto = () => open("AUTOMATION", { sub: "", tabs: [["slots", "Quick slots"], ["rules", "Bot rules"]], render(tab, redraw, subEl) {
    const a = autoRec(eco); subEl.textContent = a.refill ? "Auto-refill on" : "Auto-refill off";
    if (tab === "rules") return rules(a, redraw);
    const out = [h("p", { class: "gc-note" }, "While AUTO is hunting, each quick slot is used by itself when its stat drops below the line you set. Pick what goes in a slot, or let AUTO DRAW fill empty slots from your bag.")];
    for (const k of KINDS) {
      const cur = slotInfo(eco, k.id), low = !cur.item || cur.qty < 1, list = pick === k.id ? candidates(eco, k.id) : null;
      out.push(h("div", { class: "gp-card au-slot", style: `--c:${k.col}` }, h("div", { class: "au-slot-h" }, h("span", { class: "au-ico", html: uiIcon(k.ic) }), h("div", null, h("b", null, k.full), h("small", null, cur.item ? `${cur.item.name} ×${cur.qty} · ${describeItem(cur.item, k.id)}` : "Empty slot")), h("em", { class: low ? "low" : "" }, cur.item ? "×" + cur.qty : "—")),
        h("div", { class: "gs-row au-th" }, h("div", null, h("b", null, `Use below ${a.th[k.id]}%`), h("small", null, k.id === "meal" ? "Satiety — eats before you start to starve" : `${k.unit} — drinks automatically while hunting`)), h("input", { type: "range", class: "gs-range", min: 10, max: 90, step: 5, value: a.th[k.id], oninput: (e) => { a.th[k.id] = +e.target.value; e.target.closest(".gs-row").querySelector("b").textContent = `Use below ${a.th[k.id]}%`; eco.changed?.(); } })),
        h("div", { class: "au-btns" }, h("button", { class: "gm-btn sm alt", onclick: () => { audio.tap(); pick = pick === k.id ? null : k.id; redraw(); } }, pick === k.id ? "CLOSE LIST" : "CHANGE ITEM"), h("button", { class: "gm-btn sm alt", disabled: !cur.item, onclick: () => { audio.tap(); a.slots[k.id] = null; eco.changed?.(); redraw(); } }, "CLEAR"), h("button", { class: "gm-btn sm", disabled: low, onclick: () => { api.autoUse(k.id); redraw(); } }, "USE NOW")),
        list ? h("div", { class: "au-list" }, list.length ? list.map((x) => h("button", { class: "au-it" + (a.slots[k.id] === x.item.item_id ? " on" : ""), onclick: () => { a.slots[k.id] = x.item.item_id; eco.changed?.(); audio.ok?.(); pick = null; redraw(); } }, h("b", null, x.item.name), h("small", null, `${describeItem(x.item, k.id)} · ×${Math.floor(x.qty)}`))) : h("p", { class: "gc-note" }, "Nothing in your bag fits this slot yet.")) : null));
    }
    out.push(h("div", { class: "gs-sec" }, "AUTO DRAW"), row("Refill by itself", "When a slot runs out, fill it from your bag straight away", toggle(() => a.refill, (v) => { a.refill = v; })),
      row("Pick order", "Which item goes in first", seg([["low", "Weakest"], ["high", "Strongest"], ["stock", "Biggest stack"]], () => a.prio, (v) => { a.prio = v; }, redraw)), h("button", { class: "gm-btn", onclick: () => { api.autoDraw(); redraw(); } }, "DRAW NOW — FILL EMPTY SLOTS"));
    return out;
  } });
  function rules(a, redraw) {
    const g = () => getEngine()?.grind, c = cult(eco), rec = skillRec(eco);
    return [h("div", { class: "gs-sec" }, "HUNTING"), row("Auto-grind", "The big AUTO button — hunts the chosen monster for you", toggle(() => !!g()?.on, () => { g()?.toggle(); setTimeout(redraw, 60); })),
      row("Skills", "AUTO fires your equipped skills by itself; MANUAL waits for your taps", seg([[true, "Auto"], [false, "Manual"]], () => !!rec.auto, (v) => setAuto(eco, v), redraw)),
      row("Spirit Pressure", "Use the Rings' pressure when a fight starts (needs a bound Spirit Ring)", toggle(() => c.autoAura !== false, (v) => { c.autoAura = v; })),
      row("Stop when the bag is full", "Switch AUTO off instead of leaving loot behind", toggle(() => a.stopFull, (v) => { a.stopFull = v; })),
      h("div", { class: "gs-sec" }, "FOOD"), row("Eat when hungry", "Eats the cheapest food in your bag when Satiety is low and no Meal slot is set", toggle(() => c.autoEat, (v) => { c.autoEat = v; })),
      row("Keep food for absorption", `Auto never uses the last ${a.reserve} food items while a Spirit Ring slot is waiting`, h("div", { class: "gs-seg" }, [0, 4, 6, 10].map((n) => h("button", { class: a.reserve === n ? "on" : "", onclick: () => { a.reserve = n; audio.tap(); eco.changed?.(); redraw(); } }, String(n))))),
      h("p", { class: "gc-note" }, "Quick slots have their own tab. Everything here is saved with your character.")];
  }
}
