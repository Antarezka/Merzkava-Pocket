// In-game HUD + panels (bag, home & storage, build, facility, merchant, quests, pause). Pure DOM, no framework.
import { minuteOfDay, dayIndex } from "./data/clock.js";
import { housePlan, upgradeHouse, houseLevel } from "./data/house.js";
import { ROSTER, speciesById, getHero, expToNext, MAX_LEVEL, TIER_LABEL } from "./data/mobs.js";
import { statsOf } from "./data/progression.js";
import { installSkillPanels } from "./skillui.js";
import { installCharPanels } from "./charui.js";
import { eat, satOf } from "./data/realms.js";
import { createDialogue } from "./dialogue.js";
import { classRec, activeClass, acquireClass, CLASSES } from "./data/skills.js";
import { SKILLS, SKILL, addBooks, skillRec } from "./data/skills.js";
import { ZONES, zoneById, zoneOfLevel, AREA_NAMES, isHunting } from "./data/areas.js";
import { buildHud } from "./hud.js";

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (k === "style") e.style.cssText = v; else e.setAttribute(k, v === true ? "" : v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const ICON = {
  bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5zM9 8a3 3 0 016 0"/></svg>',
  build: '<svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/></svg>',
  quest: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  sword: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9M14 10l5-5v-1h-1l-5 5M4 20l2-1M6 16l2 2"/></svg>',
};
const CAT_COL = { raw: "#8a6a4a", forage: "#5f8f5f", tool: "#6a7f9a", seed: "#a18a3a", crop: "#c0793a", herb: "#4d9a82", fish: "#4a7fa8" };
const clockText = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const WHY = { bag_full: "Your bag is full.", requirements: "Requirements not met.", blocked: "Can't build there.", merchant_away: "The merchant has left for the day.", no_funds: "Not enough xc.", out_of_stock: "Out of stock.", not_wanted: "He doesn't want that.", missing: "You don't have that.", nothing_to_collect: "Nothing to collect yet.", max_level: "Already at the highest level.", busy: "Busy right now." };

export function createGameUI({ hud, layer, toastBox, eco, catalog, identity, audio, music, getOpts, getEngine, onPause }) {
  const cat = catalog; let sheet = null, placing = null, merchantTick = null;
  const api = { audio };

  // ---------------------------------------------------------------- toasts
  api.toast = (txt) => { if (!txt) return; api.logLine?.(txt); const t = h("div", { class: "gh-toast" }, txt); toastBox.append(t); while (toastBox.children.length > 3) toastBox.firstChild.remove(); setTimeout(() => t.remove(), 2600); };
  const why = (res, fallback = "Couldn't do that.") => WHY[res?.reason] || fallback;
  const off = [eco.on("toast", api.toast)];
  const dlg = createDialogue({ h, root: layer, hud, audio, getEngine }); api.say = dlg.say; api.dlgDispose = dlg.dispose; api.blocking = () => !!sheet || !!placing?.blocking || dlg.isOpen();

  // ---------------------------------------------------------------- HUD (portrait layout lives in hud.js)
  buildHud({ h, hud, eco, audio, api, getEngine });
  let bossNm, bossLv, bossLag, bossFill, bossTxt;
  const bossEl = h("div", { class: "gh-boss gm-hidden" }, h("div", { class: "nm" }, (bossNm = h("b")), (bossLv = h("small"))), h("div", { class: "bar" }, (bossLag = h("i", { class: "lag" })), (bossFill = h("i", { class: "fill" })), (bossTxt = h("span")))); hud.append(bossEl);
  const hudFrame = api.frame;
  api.frame = () => {
    hudFrame(); const gr = getEngine()?.grind;
    const bt = gr?.target, showB = !!(gr?.on && bt && bt.sp.tier !== "mob" && gr.mobs.includes(bt)); bossEl.classList.toggle("gm-hidden", !showB);
    if (showB) { bossEl.classList.toggle("sub", bt.sp.tier === "sub"); bossNm.textContent = bt.sp.name; bossLv.textContent = `${TIER_LABEL[bt.sp.tier].toUpperCase()} · LV ${bt.lv}`; bossFill.style.width = Math.max(0, bt.hp / bt.max * 100).toFixed(1) + "%"; bossLag.style.width = Math.max(0, bt.lag / bt.max * 100).toFixed(1) + "%"; bossTxt.textContent = `${Math.ceil(Math.max(0, bt.hp))} / ${bt.max}`; }
  };
  const hudUpdate = setInterval(api.frame, 250); api.frame();

  // ---------------------------------------------------------------- sheet helper
  function close() { sheet?.remove(); sheet = null; if (merchantTick) { clearInterval(merchantTick); merchantTick = null; } }
  function open(title, { sub, tabs, render, initial }) {
    close(); const body = h("div", { class: "gp-body" }), tabBox = h("div", { class: "gp-tabs" }), subEl = h("small", null, sub || "");
    let tab = initial || tabs?.[0]?.[0]; const redraw = () => { tabBox.replaceChildren(...(tabs || []).map(([id, lab]) => h("button", { class: "gm-chip" + (id === tab ? " on" : ""), onclick: () => { tab = id; audio.tap(); redraw(); } }, lab))); const nodes = render(tab, redraw, subEl); body.replaceChildren(...(Array.isArray(nodes) ? nodes : [nodes])); };
    sheet = h("div", { class: "gp", onclick: (e) => { if (e.target === sheet) close(); } }, h("div", { class: "gp-sheet" }, h("div", { class: "gp-grab" }), h("div", { class: "gp-head" }, h("h3", null, title), subEl, h("button", { class: "gp-x", onclick: () => { audio.tap(); close(); } }, "✕")), tabs ? tabBox : null, body));
    layer.append(sheet); redraw(); const sub2 = eco.on("change", () => { if (!sheet?.isConnected) return sub2(); redraw(); }); off.push(sub2); return { redraw };
  }
  api.close = close;
  const tile = (item, qty, on, onclick) => h("button", { class: "gp-item" + (on ? " on" : ""), onclick }, h("i", { style: `background:${CAT_COL[item.category] || "#6a5a7a"}` }, item.name[0]), item.name, qty != null ? h("em", null, fmt(qty)) : null);

  // ---------------------------------------------------------------- hunting (auto-grind target list)
  api.openHunt = () => {
    const cur0 = speciesById(getHero(eco).species);
    const row = (sp) => {
      const hero = getHero(eco), cur = hero.species === sp.id, fit = hero.lv >= sp.lv[0] - 2 && hero.lv <= sp.lv[1] + 8, tough = sp.lv[0] > hero.lv + 4;
      return h("button", { class: "gp-mob" + (cur ? " on" : ""), onclick: () => { audio.tap(); getEngine()?.grind.setSpecies(sp.id); } },
        h("i", { style: `background:${sp.tint || "#7a6a8a"}` }, sp.tier === "boss" ? "★" : sp.tier === "sub" ? "◆" : ""),
        h("span", null, h("b", null, sp.name, sp.jp ? h("small", { style: "margin-left:6px;opacity:.6" }, sp.jp) : null), h("small", null, `${TIER_LABEL[sp.tier]} · Lv ${sp.lv[0] === sp.lv[1] ? sp.lv[0] : sp.lv[0] + "–" + sp.lv[1]} · ${sp.drops.slice(0, 2).join(", ")}`)),
        h("em", { class: tough ? "bad" : fit ? "good" : "" }, cur ? "TARGET" : tough ? "TOUGH" : fit ? "FITS" : ""));
    };
    open("HUNTING", { sub: "", initial: cur0.z, tabs: ZONES.map((z) => [z.id, `Lv ${z.lv[0]}–${z.lv[1]}`]), render(tab, redraw, subEl) {
      const hero = getHero(eco), st = statsOf(eco), gr = getEngine()?.grind, sp = speciesById(hero.species), z = zoneById(tab); subEl.textContent = `Lv ${hero.lv} · HP ${Math.ceil(hero.hp)}/${st.maxHp}`;
      const card = h("div", { class: "gp-card" }, h("h4", null, `Target: ${sp.name}`), h("p", null, `${AREA_NAMES[sp.z]} · ${TIER_LABEL[sp.tier]} · Lv ${sp.lv[0] === sp.lv[1] ? sp.lv[0] : sp.lv[0] + "–" + sp.lv[1]} · drops ${sp.drops.join(", ")}`),
        gr?.on ? h("p", null, `This run: ${gr.session.kills} kills · +${gr.session.exp} exp · +${Math.round(gr.session.xc * 100) / 100} xc`) : h("p", null, "Auto-grind travels to the target's area, fights, loots and repeats. It rests when your HP is low."),
        h("button", { class: "gm-btn sm" + (gr?.on ? " rose" : ""), style: "margin-top:8px", onclick: () => { audio.tap(); if (gr?.on) { gr.setOn(false, "manual"); redraw(); } else { close(); gr.toggle(); } } }, gr?.on ? "STOP AUTO" : "START AUTO"));
      const list = ROSTER.filter((m) => m.z === tab), zone = h("div", { class: "gp-card" }, h("h4", null, z.name), h("p", null, z.theme + (z.id >= "z7" && /^z(7|8|9|10|11)$/.test(z.id) ? "" : "")));
      return [card, zone, h("div", { class: "gp-moblist" }, ["mob", "sub", "boss"].flatMap((t) => list.filter((m) => m.tier === t).map(row))), h("p", { class: "gc-note" }, "Monster names come from Japanese folklore. Zones 7–11 are placeholders.")];
    } });
    const g = getEngine()?.grind; if (g) { const un = g.onChange(() => { if (!sheet?.isConnected) return un(); }); off.push(un); }
  };
  // ---------------------------------------------------------------- travel map (fade between areas)
  api.openMap = () => {
    open("TRAVEL MAP", { sub: "", render() {
      const e = getEngine(), hero = getHero(eco), here = e?.areaId || "home", ids = ["home", "village", "palace", ...ZONES.map((z) => z.id)];
      return [h("p", { class: "gc-note", style: "margin:0 0 8px" }, "Roads connect Home, the Village and the zones. Pick a place to travel there."), ...ids.map((id) => {
        const z = zoneById(id), tough = z && z.lv[0] > hero.lv + 6;
        return h("button", { class: "gp-mob" + (id === here ? " on" : ""), onclick: () => { audio.tap(); close(); if (id !== here) e?.travel(id, "s"); } },
          h("i", { style: `background:${z ? "#6a7f9a" : id === "home" ? "#a18a3a" : "#c0793a"}` }, z ? String(ZONES.indexOf(z) + 1) : id === "home" ? "⌂" : id === "village" ? "村" : "宮"),
          h("span", null, h("b", null, AREA_NAMES[id]), h("small", null, z ? `Lv ${z.lv[0]}–${z.lv[1]} · ${z.theme}` : id === "home" ? "Your land · storage · facilities" : id === "village" ? "Shops · villagers" : "Imperial court · nobles")),
          h("em", { class: tough ? "bad" : "" }, id === here ? "HERE" : tough ? "TOUGH" : ""));
      })];
    } });
  };

  installSkillPanels({ api, h, open, close, eco, audio, cat, getEngine });
  installCharPanels({ api, h, open, close, eco, audio, music, getOpts, cat, getEngine, layer, hud });
  // ---------------------------------------------------------------- NPC conversations (everything goes through the dialogue box)
  api.talkMerchant = async () => { const m = eco.merchant(); await api.say([{ who: "npc", npc: { model: "hooded", view: "SW" }, name: m.name || "Merchant", text: m.greeting || "Fine day for honest trade." }]); api.openMerchant(); };
  api.talkNpc = async (n) => {
    if (n.kind === "awaken") return api.talkAwakening(n); if (n.kind === "academy") return api.talkAcademy(n);
    const lvl = getHero(eco).lv, act = activeClass(eco), npc = { model: n.model, view: "SW" };
    if (n.kind === "class") {
      if (lvl < 9) { await api.say([{ who: "player", text: "Master, may I begin a martial path?" }, { who: "npc", npc, name: n.name, text: "A blade without a body is only iron. Return when you have grown — Level 9." }]); return; }
      const r = await api.say([{ who: "npc", npc, name: n.name, text: act ? `You walk the ${act.name} path. Will you keep it, or take another?` : "Every disciple begins unclassed. Choose a discipline and a weapon — and a Skill Book will open before you.", choices: ["Show me the disciplines", "Not now"] }]);
      if (r === 0) api.openClasses();
    } else await api.say([{ who: "npc", npc, name: n.name, text: n.text || "…" }]);
  };

  // ---------------------------------------------------------------- bag
  api.openBag = () => {
    let sel = null, cf = "all";
    open("BAG", { sub: "", tabs: [["all", "All"], ...[...new Set(eco.bagList().map((x) => x.item.category))].map((c) => [c, c[0].toUpperCase() + c.slice(1)]), ["books", "Skill Books"]],
      render(tab, redraw, subEl) {
        cf = tab; subEl.textContent = `${eco.bagUsed()}/${eco.state.bag.slots} slots`;
        if (cf === "books") { const bk = Object.entries(skillRec(eco).books).filter(([, n]) => n > 0); return bk.length ? h("div", { class: "gp-list" }, bk.map(([id, n]) => h("div", { class: "gp-line" }, h("span", null, `Skill Book: ${SKILL[id]?.name || id}`), h("em", null, "×" + n)))) : h("div", { class: "gp-empty" }, "No Skill Books yet. They drop from monsters and reward certain quests — spend them in your Class Skill Tree."); } const list = eco.bagList().filter((x) => cf === "all" || x.item.category === cf);
        const grid = list.length ? h("div", { class: "gp-grid" }, list.map((x) => tile(x.item, x.qty, sel === x.item.item_id, () => { sel = x.item.item_id; audio.tap(); redraw(); }))) : h("div", { class: "gp-empty" }, "Nothing here yet.");
        const it = sel && cat.itemById.get(sel), det = it ? h("div", { class: "gp-card" }, h("h4", null, `${it.name} × ${fmt(eco.qty(it.item_id))}`), h("p", null, `${it.category} · tier ${it.quality_tier ?? 1} · base ${fmt(cat.price(it.item_id).base)} xc · merchant pays ~${fmt(cat.price(it.item_id).buyback)} xc`), ...(it.uses || []).slice(0, 2).map((u) => h("p", null, "• " + u)), it.category === "food" ? h("button", { class: "gm-btn sm", onclick: () => { const r = eat(eco, it.item_id); audio.tap(); api.toast(r.ok ? `Ate ${r.name} · satiety ${Math.round(r.sat)}%` : r.reason === "full" ? "You are not hungry." : "Can't eat that."); redraw(); } }, `EAT (+${satOf(it)} satiety)`) : null) : null;
        return [det, grid];
      } });
  };

  // ---------------------------------------------------------------- home / storage / house
  api.openHome = () => {
    const chests = () => eco.storages();
    open("HOME", { tabs: [["storage", "Storage"], ["house", "House"], ["ledger", "Ledger"]], render(tab, redraw, subEl) {
      if (tab === "house") {
        const lv = houseLevel(eco), p = housePlan(eco), names = ["", "Stilt Hut", "Timber Cottage", "Courtyard Manor"]; subEl.textContent = "Level " + lv;
        const card = h("div", { class: "gp-card" }, h("h4", null, `${names[lv]} (Lv ${lv})`), h("p", null, lv === 1 ? "A modest stilt house at the edge of an overgrown field." : lv === 2 ? "Sturdier timber, a proper hall and a porch." : "A walled courtyard manor — the finest the village has seen."));
        if (p.max) return [card, h("div", { class: "gp-empty" }, "Your house is fully upgraded.")];
        const up = h("div", { class: "gp-card" }, h("h4", null, `Upgrade to ${p.name}`), h("p", null, `Cost: ${p.cash} xc`), ...p.mats.map((m) => h("p", null, `${m.name} ${fmt(m.have)}/${m.quantity}`)), p.missing.length ? h("div", { class: "gp-miss" }, "Missing: " + p.missing.join(", ")) : null,
          h("button", { class: "gm-btn sm", style: "margin-top:8px", disabled: !p.ok, onclick: () => { const r = upgradeHouse(eco); if (r.ok) audio.ok(); else { audio.no(); api.toast(why(r)); } redraw(); } }, "UPGRADE"));
        return [card, up];
      }
      if (tab === "ledger") return eco.state.ledger.slice(0, 40).map((l) => h("div", { class: "gp-line" }, h("span", null, l.note, h("small", null, l.type)), h("b", { style: l.amount < 0 ? "color:#ffb4a8" : "color:#b6e6b0" }, (l.amount >= 0 ? "+" : "") + fmt(l.amount) + " xc")));
      const out = []; for (const s of chests()) {
        subEl.textContent = "";
        out.push(h("div", { class: "gs-sec" }, `${s.name.toUpperCase()}  ${s.used}/${s.slots}`));
        const st = eco.storageList(s.uid); out.push(st.length ? h("div", { class: "gp-grid" }, st.map((x) => tile(x.item, x.qty, false, () => { const r = eco.moveToBag(s.uid, x.item.item_id, 99); if (!r.ok) { audio.no(); api.toast(why(r)); } else audio.tap(); redraw(); }))) : h("div", { class: "gp-empty" }, "Empty — tap a bag item below to store it."));
      }
      out.push(h("div", { class: "gs-sec" }, `BAG  ${eco.bagUsed()}/${eco.state.bag.slots}  — tap to store (all)`));
      const target = chests()[0]; const bl = eco.bagList(); out.push(bl.length ? h("div", { class: "gp-grid" }, bl.map((x) => tile(x.item, x.qty, false, () => { if (!target) return; const r = eco.moveToStorage(target.uid, x.item.item_id, x.qty); if (!r.ok) { audio.no(); api.toast(why(r, "That storage is full.")); } else audio.tap(); redraw(); }))) : h("div", { class: "gp-empty" }, "Bag is empty."));
      return out;
    } });
  };

  // ---------------------------------------------------------------- build
  api.openBuild = () => {
    const fams = Object.keys(cat.facilityFamilies); let fam = fams[0];
    open("BUILD", { sub: "place on your claimed land", tabs: fams.map((f) => [f, f.replace(" & ", " · ")]), render(tab, redraw) {
      fam = tab; return (cat.facilityFamilies[fam] || []).map((f) => {
        const p = eco.buildPlan(f.facility_id), req = f.build_requirements || {};
        return h("div", { class: "gp-card" }, h("h4", null, f.name), h("p", null, `${fmt(req.cash_fee_xc || 0)} xc · ${(req.materials || []).map((m) => `${m.quantity}× ${m.item_name}`).join(", ") || "no materials"}`),
          h("p", null, `Build time ${p.seconds ? Math.ceil(p.seconds / 60) + " min" : "–"} · tools: ${(req.builder_tools || []).join(", ") || "none"}`), p.missing?.length ? h("div", { class: "gp-miss" }, "Missing: " + p.missing.join(" · ")) : null,
          h("button", { class: "gm-btn sm", style: "margin-top:8px", disabled: !p.ok, onclick: () => { audio.tap(); close(); startPlacing(f); } }, p.ok ? "PLACE" : "NOT YET"));
      });
    } });
  };
  function startPlacing(f) {
    const eng = getEngine(); eng.beginPlacing(f); placing = { f, blocking: false }; hud.classList.add("placing"); api.placeBox.classList.remove("gm-hidden");
    api.placeBox.replaceChildren(h("p", null, `Tap the land to position the ${f.name}. Green = valid.`), h("div", null,
      h("button", { class: "gm-btn alt", onclick: () => { eng.cancelPlacing(); endPlacing(); } }, "CANCEL"),
      h("button", { class: "gm-btn", onclick: () => { const r = eng.confirmPlacing(); if (r.ok) { audio.thud(); api.toast(f.name + " — construction started."); endPlacing(); } else { audio.no(); api.toast(r.reason === "blocked" ? "Can't build there." : r.missing?.join(", ") || why(r)); } } }, "BUILD HERE")));
  }
  function endPlacing() { placing = null; hud.classList.remove("placing"); api.placeBox.classList.add("gm-hidden"); }

  // ---------------------------------------------------------------- facility
  api.openFacility = (uid) => {
    open("FACILITY", { render(_, redraw, subEl) {
      const x = eco.facilities().find((f) => f.uid === uid); if (!x) return h("div", { class: "gp-empty" }, "Gone.");
      const def = x.def; subEl.textContent = `Lv ${x.level}`; const out = [h("div", { class: "gp-card" }, h("h4", null, def.name), h("p", null, def.family))];
      if (x.status !== "ready") { const pct = Math.max(0, Math.min(1, 1 - x.remainingSim / Math.max(1, (def.construction?.duration_sim_minutes || 600)))); out.push(h("div", { class: "gp-card" }, h("h4", null, x.status === "upgrading" ? "Upgrading…" : "Under construction…"), h("div", { class: "gp-prog" }, h("i", { style: `width:${Math.round(pct * 100)}%` })), h("p", null, `About ${Math.ceil(x.remainingSim / 48)} min left (real time).`))); return out; }
      const buf = Object.entries(x.buffer || {}).filter(([, q]) => q >= 0.01); const doneProc = x.process?.done;
      if (buf.length || doneProc) out.push(h("div", { class: "gp-card" }, h("h4", null, "Ready to collect"), ...buf.map(([id, q]) => h("p", null, `${fmt(q)} × ${cat.itemName(id)}`)), doneProc ? h("p", null, "Finished production waiting.") : null,
        h("button", { class: "gm-btn sm", style: "margin-top:8px", onclick: () => { const r = eco.collect(uid); if (r.ok) { audio.coin(); api.toast("Collected " + r.gained.map((g) => `${fmt(g.quantity)} ${cat.itemName(g.item_id)}`).join(", ")); } else { audio.no(); api.toast(why(r)); } redraw(); } }, "COLLECT")));
      if (x.process && !x.process.done) out.push(h("div", { class: "gp-card" }, h("h4", null, "Working…"), h("p", null, `${cat.recipeById.get(x.process.recipe_id)?.name || "Production"} — ${Math.ceil(Math.max(0, x.process.finish_sim - eco.now()) / 48 * 10) / 10} min left.`)));
      if (def.family === "Farming & horticulture") {
        const plot = eco.state.plots[uid]; if (plot) out.push(h("div", { class: "gp-card" }, h("h4", null, `Growing ${cat.itemName(plot.crop)} ×${plot.n}`), h("button", { class: "gm-btn sm", style: "margin-top:8px", onclick: () => { const r = eco.harvestPlot(uid); if (r.ok) { audio.coin(); api.toast(`Harvested ${fmt(r.quantity)} ${cat.itemName(r.item_id)}`); } else api.toast(r.reason === "growing" ? "Still growing." : why(r)); redraw(); } }, "HARVEST")));
        else { const seeds = eco.bagList().filter((b) => b.item.category === "seed"); out.push(h("div", { class: "gp-card" }, h("h4", null, "Plant seeds"), seeds.length ? seeds.map((s) => h("button", { class: "gm-btn sm", style: "margin:4px 6px 0 0", onclick: () => { const r = eco.plant(uid, s.item.item_id, 99); if (r.ok) audio.ok(); else { audio.no(); api.toast(r.missing ? "Need: " + r.missing.join(", ") : why(r)); } redraw(); } }, `${s.item.name} (${fmt(s.qty)})`)) : h("p", null, "No seeds in your bag."))); }
      }
      const rec = eco.recipesFor(uid); if (rec.length) { out.push(h("div", { class: "gs-sec" }, "RECIPES")); for (const { recipe, canRun, missing } of rec) out.push(h("div", { class: "gp-card" }, h("h4", null, recipe.name), h("p", null, recipe.inputs.map((i) => `${i.quantity}× ${i.item_name}`).join(", ") + " → " + recipe.outputs.map((o) => `${o.quantity}× ${o.item_name || cat.itemName(o.item_id)}`).join(", ")), missing.length ? h("div", { class: "gp-miss" }, missing.join(" · ")) : null, h("button", { class: "gm-btn sm", style: "margin-top:8px", disabled: !canRun, onclick: () => { const r = eco.startRecipe(uid, recipe.recipe_id, 1); if (r.ok) audio.ok(); else api.toast(why(r)); redraw(); } }, "START"))); }
      const up = eco.upgradePlan(uid); if (up.ok !== undefined && !up.reason) out.push(h("div", { class: "gp-card" }, h("h4", null, `Upgrade to level ${x.level + 1}`), h("p", null, `${fmt(up.cost)} xc · ${(up.materials || []).map((m) => `${m.quantity}× ${m.item_name || cat.itemName(m.item_id)}`).join(", ")}`), up.missing?.length ? h("div", { class: "gp-miss" }, "Missing: " + up.missing.join(" · ")) : null, h("button", { class: "gm-btn sm", style: "margin-top:8px", disabled: !up.ok, onclick: () => { const r = eco.upgradeFacility(uid); if (r.ok) audio.thud(); else api.toast(why(r)); redraw(); } }, "UPGRADE")));
      return out;
    } });
  };

  // ---------------------------------------------------------------- merchant
  api.openMerchant = () => {
    let sel = null, qty = 1;
    open("TRAVELLING MERCHANT", { tabs: [["buy", "Buy"], ["sell", "Sell"]], render(tab, redraw, subEl) {
      const m = eco.merchant(); subEl.textContent = m.present ? m.name || "" : "away";
      const out = []; if (!m.present) out.push(h("div", { class: "gp-card" }, h("h4", null, "The merchant has left."), h("p", null, "He visits every day from 08:00 to 18:00.")));
      const qrow = h("div", { class: "gp-qty", style: "margin-bottom:8px" }, [1, 5, 10, 25].map((n) => h("button", { class: "gm-chip" + (qty === n ? " on" : ""), onclick: () => { qty = n; audio.tap(); redraw(); } }, "×" + n)));
      out.push(qrow);
      if (tab === "buy") {
        for (const s of m.stock) { const left = s.qty - (eco.state.merchant.bought?.[s.item_id] || 0), it = cat.itemById.get(s.item_id); if (!it) continue;
          out.push(h("div", { class: "gp-line" }, h("span", null, it.name, h("small", null, `${fmt(s.price)} xc · ${left} left`)), h("button", { class: "gm-btn sm", disabled: !m.present || left < 1, onclick: () => { const r = eco.buyFromMerchant(s.item_id, Math.min(qty, left)); if (r.ok) audio.coin(); else { audio.no(); api.toast(why(r)); } redraw(); } }, "BUY"))); }
      } else {
        const wantedIds = new Set(m.wanted.map((w) => w.item_id));
        const bl = eco.bagList().map((x) => ({ ...x, price: eco.sellPriceFor(x.item.item_id, 1) })).filter((x) => x.price != null);
        if (m.wanted.length) out.push(h("div", { class: "gs-sec" }, "TODAY HE PAYS A PREMIUM FOR"), ...m.wanted.map((w) => h("div", { class: "gp-line" }, h("span", null, cat.itemName(w.item_id), h("small", null, `${fmt(w.price)} xc each · up to ${Math.max(0, w.qty - (eco.state.merchant.soldWanted?.[w.item_id] || 0))}`)), h("b", null, `have ${fmt(eco.qty(w.item_id))}`))));
        out.push(h("div", { class: "gs-sec" }, "YOUR BAG"));
        out.push(bl.length ? bl.map((x) => h("div", { class: "gp-line" }, h("span", null, `${x.item.name}${wantedIds.has(x.item.item_id) ? " ★" : ""}`, h("small", null, `${fmt(x.price)} xc each · have ${fmt(x.qty)}`)), h("button", { class: "gm-btn sm", disabled: !m.present, onclick: () => { const r = eco.sellToMerchant(x.item.item_id, Math.min(qty, x.qty)); if (r.ok) { audio.coin(); api.toast(`+${fmt(r.gain)} xc`); } else { audio.no(); api.toast(why(r)); } redraw(); } }, "SELL"))) : h("div", { class: "gp-empty" }, "Nothing to sell."));
      }
      return out;
    } });
  };

  // ---------------------------------------------------------------- quests
  api.openQuests = () => {
    open("QUESTS", { sub: "daily · resets each in-game day", render(_, redraw) {
      const list = eco.questList(); if (!list.length) return h("div", { class: "gp-empty" }, "No quests right now.");
      return list.map((q) => h("div", { class: "gp-card" }, h("h4", null, (q.tutorial ? "★ " : "") + q.title), h("p", null, q.desc), h("div", { class: "gp-prog" }, h("i", { style: `width:${Math.round(q.progress / q.target * 100)}%` })),
        h("p", null, `${fmt(q.progress)}/${q.target} · reward ${q.reward.xc || 0} xc`),
        q.claimed ? h("p", null, "✓ Claimed") : q.done ? h("button", { class: "gm-btn sm", onclick: () => { const r = eco.claimQuest(q.id); if (r.ok) { audio.coin(); api.toast(`Reward: ${r.reward.xc || 0} xc`); } else api.toast(why(r)); redraw(); } }, "CLAIM")
          : q.type === "deliver" ? h("button", { class: "gm-btn sm", onclick: () => { const r = eco.deliverQuest(q.id); if (r.ok) { audio.ok(); } else api.toast(why(r, "You don't have enough.")); redraw(); } }, "DELIVER") : null));
    } });
  };

  // ---------------------------------------------------------------- pause
  api.openPause = () => {
    open("PAUSED", { render() {
      const out = [h("button", { class: "gm-btn", style: "margin-bottom:10px", onclick: () => { audio.tap(); close(); } }, "RESUME"),
        h("button", { class: "gm-btn alt", style: "margin-bottom:10px", onclick: () => { close(); onPause("options"); } }, "OPTIONS"),
        h("button", { class: "gm-btn alt", style: "margin-bottom:10px", onclick: () => { close(); onPause("menu"); } }, "SAVE & MAIN MENU")];
      if (eco.isDev) out.push(h("div", { class: "gs-sec" }, "DEVELOPER TOOLS"), h("div", { class: "gp-qty" }, h("button", { class: "gm-chip", onclick: () => { eco.devGrant({ xc: 100 }); api.toast("+100 xc"); } }, "+100 xc"), ...[["Awaken", "awaken"], ["Realm cap", "cap"], ["Spirit Ring", "ring"], ["+12 food", "food"], ["Skip absorb", "skip"]].map(([t, k]) => h("button", { class: "gm-chip", onclick: () => api.devCult[k]() }, t)), h("button", { class: "gm-chip", onclick: () => { const hr = getHero(eco); hr.lv = Math.min(MAX_LEVEL, hr.lv + 10); eco.changed?.(); api.toast(`Dev: Lv ${hr.lv}`); } }, "+10 levels"), h("button", { class: "gm-chip", onclick: () => { for (const k of SKILLS) addBooks(eco, k.id, 20); api.toast("Dev: +20 of every skill book"); } }, "+20 books"), h("button", { class: "gm-chip", onclick: () => { const hr = getHero(eco); hr.lv = Math.max(hr.lv, 9); for (const c of CLASSES) if (!classRec(eco).owned.includes(c.id)) acquireClass(eco, c.id, hr.lv, true); eco.changed?.(); api.toast("Dev: all classes owned"); } }, "all classes"), h("button", { class: "gm-chip", onclick: () => { eco.devSkipTime(60); api.toast("+1 hour"); } }, "+1 h"), h("button", { class: "gm-chip", onclick: () => { eco.devSkipTime(480); api.toast("+8 hours"); } }, "+8 h")));
      return out;
    } });
  };

  api.destroy = () => { clearInterval(hudUpdate); api.dlgDispose?.(); api.charDestroy?.(); off.forEach((f) => f()); close(); };
  return api;
}
