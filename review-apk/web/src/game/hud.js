// Portrait in-game HUD (modelled on the reference video, adapted to portrait):
// top-left hero card (avatar, Lv, power, EXP/HP, xc) · top-right minimap + zone card · tabbed quest tracker · target list on the right edge ·
// activity log bottom-left · "Auto is working" status pill · AUTO + skill cluster bottom-right · icon dock (bag, build, home, quests, menu).
import { minuteOfDay, dayIndex } from "./data/clock.js";
import { getHero, expToNext, MAX_LEVEL, speciesById } from "./data/mobs.js";
import { statsOf, pointsOf, powerOf, NODE_COST } from "./data/progression.js";
import { SKILLS, SKILL, skillRec, canUnlock, setAuto, SLOT_COUNT } from "./data/skills.js";
import { uiIcon, skillIcon } from "./art/icons.js";
import { zoneById, AREA_NAMES } from "./data/areas.js";
import { gateOf, cult, title as realmTitle } from "./data/realms.js";

const ICON = { bag: uiIcon("bag"), build: uiIcon("build"), home: uiIcon("home"), quest: uiIcon("quest"), menu: uiIcon("menu"), sword: uiIcon("hunt"), map: uiIcon("map"), book: uiIcon("skills"), tree: uiIcon("meridian"), plus: uiIcon("plus") };
const TERRAIN_RGB = null;
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function buildHud({ h, hud, eco, audio, api, getEngine }) {
  const log = []; let tab = "quest", open = true, avatarKey = "";
  const mk = (tag, cls, ...kids) => h(tag, { class: cls }, ...kids);
  // ---- top-left hero card
  const av = h("canvas", { class: "hd-av", width: 112, height: 112 }), lvB = mk("b", "hd-lvb", "1"), nm = mk("b", "hd-nm", eco.state.profile.name), pw = mk("span", "hd-pw", "⚔ 0");
  const xpI = h("i"), xpT = mk("em", "", "0%"), hpI = h("i"), hpT = mk("em", "", "0"), qiI = h("i"), qiT = mk("em", "", "0"), xcT = mk("span", "", "0 xc"), dayT = mk("span", "", "Day 1");
  const hero = mk("div", "hd-hero hd-keep", mk("div", "hd-avw", av, lvB), mk("div", "hd-id", mk("div", "hd-nmrow", nm, pw), mk("div", "hd-bar xp", xpI, xpT), mk("div", "hd-bar hp", hpI, hpT), mk("div", "hd-bar qi", qiI, qiT), mk("div", "hd-cur", xcT, dayT)));
  hero.addEventListener("click", () => { audio.tap(); api.openCharacter(); });
  // ---- top-right minimap + zone
  const mm = h("canvas", { class: "hd-mm", width: 168, height: 168 }), zName = mk("b", "", ""), zLv = mk("small", "", ""), zMood = mk("small", "", "");
  const mini = mk("div", "hd-mini hd-keep", mm, mk("div", "hd-zone", zName, zLv, zMood)); mini.addEventListener("click", () => { audio.tap(); api.openMap(); });
  // ---- quest tracker
  const tabsEl = mk("div", "hd-tabs"), bodyEl = mk("div", "hd-qbody"), toggle = h("button", { type: "button", class: "hd-fold", "aria-label": "Fold tracker", onclick: () => { open = !open; renderTabs(); } }, "▾");
  const quest = mk("div", "hd-quest hd-keep", mk("div", "hd-qhead", tabsEl, toggle), bodyEl);
  const TABS = [["quest", "Quest"], ["hero", "Stats"], ["log", "Log"]];
  function renderTabs() {
    tabsEl.replaceChildren(...TABS.map(([id, label]) => h("button", { type: "button", class: "hd-tab" + (id === tab ? " on" : ""), onclick: () => { audio.tap(); tab = id; open = true; renderTabs(); } }, label)));
    quest.classList.toggle("folded", !open); toggle.textContent = open ? "▾" : "▸"; renderBody();
  }
  function renderBody() {
    if (!open) { bodyEl.replaceChildren(); return; }
    if (tab === "quest") {
      const list = eco.questList().filter((q) => !q.claimed).slice(0, 3);
      bodyEl.replaceChildren(...(list.length ? list.map((q) => h("div", { class: "hd-q" + (q.done ? " done" : ""), onclick: () => { audio.tap(); api.openQuests(); } }, mk("span", "", (q.tutorial ? "★ " : "") + q.title), mk("em", "", q.done ? "READY" : `${fmt(Math.min(q.progress, q.target))}/${q.target}`), mk("div", "hd-qb", h("i", { style: `width:${Math.round(Math.min(1, q.progress / q.target) * 100)}%` })))) : [mk("p", "hd-none", "All quests claimed.")]));
    } else if (tab === "hero") {
      const hr = getHero(eco), st = statsOf(eco), pt = pointsOf(eco), g = getEngine()?.grind;
      bodyEl.replaceChildren(...[["Realm", realmTitle(hr.lv)], ["Power", powerOf(st)], ["Satiety", Math.round(cult(eco).sat) + "%"], ["Stat points", `${pt.free} free`], ["ATK / DEF", `${Math.round(st.atk)} / ${Math.round(st.def)}`], ["Max HP", st.maxHp], ["Qi", `${Math.floor(hr.qi ?? st.qiCap)} / ${st.qiCap}`], ["Crit", `${st.crit.toFixed(1)}% ×${(st.critDmg / 100).toFixed(2)}`], ["Deadly", `${st.deadly.toFixed(1)}%`], ["Chant −", `${st.chantRed.toFixed(1)}%`], ["Recovery −", `${st.recovRed.toFixed(1)}%`], ["Cooldown −", `${st.cdRed.toFixed(1)}%`], ["Evade", `${st.evade.toFixed(1)}%`], ["This run", g?.on ? `${g.session.kills} kills · +${g.session.exp} exp` : `${hr.kills || 0} kills total`]].map(([k, v]) => mk("div", "hd-stat", mk("span", "", k), mk("b", "", String(v)))));
    } else bodyEl.replaceChildren(...(log.length ? log.slice(-5).reverse().map((l) => mk("p", "hd-ll", l.t)) : [mk("p", "hd-none", "Nothing yet.")]));
  }
  // ---- target list (right edge)
  const targets = mk("div", "hd-targets");
  // ---- activity log + status pill
  const logEl = mk("div", "hd-log"), pillDot = mk("i", ""), pillTxt = mk("span", ""), pill = h("button", { type: "button", class: "hd-pill hd-keep", onclick: () => { audio.tap(); getEngine()?.grind.toggle(); } }, pillDot, pillTxt);
  // ---- skills + AUTO
  const slotEls = [], slotIds = [];
  const slotBtn = (i) => { const ic = mk("span", "hd-ic", ""), nm = mk("small", "", ""), t = mk("em", "", "");
    const b = h("button", { type: "button", class: "hd-sk empty", "aria-label": "Skill slot " + (i + 1), onclick: () => { audio.tap(); const g = getEngine()?.grind, id = skillRec(eco).slots[i]; if (!id) { api.openSkills(); return; } if (g && !g.cast(id) && g.why) api.toast(g.why); } }, ic, nm, t);
    slotEls[i] = { b, ic, nm, t }; return b; };
  const huntB = h("button", { type: "button", class: "hd-mini-b", "aria-label": "Hunting list", onclick: () => { audio.tap(); api.openHunt(); } }, h("span", { html: ICON.sword }), mk("small", "", ""));
  const mapB = h("button", { type: "button", class: "hd-mini-b", "aria-label": "Travel map", onclick: () => { audio.tap(); api.openMap(); } }, h("span", { html: ICON.map }), mk("small", "", ""));
  const bookDot = h("i", { class: "dot gm-hidden" }), treeDot = h("i", { class: "dot gm-hidden" });
  const bookB = h("button", { type: "button", class: "hd-mini-b", "aria-label": "Skill Library", onclick: () => { audio.tap(); api.openSkills(); } }, h("span", { html: ICON.book }), mk("small", "", ""), bookDot);
  const treeB = h("button", { type: "button", class: "hd-mini-b", "aria-label": "Meridians", onclick: () => { audio.tap(); api.openTree(); } }, h("span", { html: ICON.tree }), mk("small", "", ""), treeDot);
  const auraT = mk("em", "", ""), auraB = h("button", { type: "button", class: "hd-aura gm-hidden", "aria-label": "Spirit Pressure", onclick: () => { audio.tap(); const g = getEngine()?.grind; if (g) g.pressure(true); } }, h("span", { html: uiIcon("aura") }), mk("small", "", "PRESSURE"), auraT);
  const modeB = h("button", { type: "button", class: "hd-mode on", "aria-label": "Skill mode", onclick: () => { audio.tap(); const r = skillRec(eco); setAuto(eco, !r.auto); api.toast(r.auto ? "Skills fire automatically while Auto is on." : "Manual skills — tap a slot to use it."); api.frame(); } }, "SKILLS · AUTO");
  const autoSub = mk("small", "", "OFF"), autoB = h("button", { type: "button", class: "hd-auto", "aria-label": "Auto-grind", onclick: () => { audio.tap(); getEngine()?.grind.toggle(); } }, h("span", { class: "hd-taiji", html: uiIcon("taiji") }), autoSub);
  api.side = mk("div", "hd-skills hd-keep", mk("div", "hd-row", huntB, mapB, bookB, treeB), modeB, mk("div", "hd-grid", ...[0, 1, 2, 3].map(slotBtn)), auraB, autoB);
  // ---- dock
  const dot = h("i", { class: "dot gm-hidden" });
  api.bar = mk("div", "hd-dock hd-keep", ...[["bag", "BAG", () => api.openBag()], ["build", "BUILD", () => api.openBuild()], ["home", "HOME", () => api.openHome()], ["quest", "QUESTS", () => api.openQuests(), dot], ["menu", "MENU", () => api.openPause()]]
    .map(([ic, label, fn, extra]) => h("button", { type: "button", "aria-label": label, onclick: () => { audio.tap(); fn(); } }, h("span", { html: ICON[ic] }), label, extra)));
  api.placeBox = mk("div", "gh-place gm-hidden");
  hud.append(hero, mini, quest, targets, logEl, pill, api.side, api.bar, api.placeBox);
  renderTabs();

  // ---- helpers
  function drawAvatar() {
    const e = getEngine(), app = e?.appSpec; if (!e?.kit || !app) return; const key = JSON.stringify(app); if (key === avatarKey) return; avatarKey = key;
    const spr = e.kit.render(app, "S"), c = av.getContext("2d"), S = av.width; c.clearRect(0, 0, S, S); c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 3, 0, 6.2832); c.clip();
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, "#5a4a6c"); g.addColorStop(1, "#3a2c48"); c.fillStyle = g; c.fillRect(0, 0, S, S); c.imageSmoothingQuality = "high"; c.drawImage(spr, 82, 52, 124, 124, 0, 6, S, S); c.restore();
  }
  const mmBase = new WeakMap(), tcol = (w) => (w.pal || ["#8d9a55", "#b3a65c", "#b98f63", "#7d5c47", "#3f7f8f", "#7fb0a4", "#a39663", "#4c8c8c", "#bda27a", "#c4a67c", "#66713f"]).map(rgbOf);
  function minimap(e) {
    const w = e.world, c = mm.getContext("2d"), S = mm.width; if (!mmBase.has(w)) { const b = document.createElement("canvas"); b.width = w.cols; b.height = w.rows; const x = b.getContext("2d"), im = x.createImageData(w.cols, w.rows), col = tcol(w);
      for (let i = 0; i < w.cols * w.rows; i++) { const t = w.tiles[i], k = col[t] || col[0], dark = w.blocked[i] && t !== 4 && t !== 7 ? 0.82 : 1; im.data[i * 4] = k[0] * dark; im.data[i * 4 + 1] = k[1] * dark; im.data[i * 4 + 2] = k[2] * dark; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); mmBase.set(w, b); }
    const T = w.tile, V = 21, pc = e.player.x / T, pr = e.player.y / T, sx = Math.max(0, Math.min(w.cols - V, pc - V / 2)), sy = Math.max(0, Math.min(w.rows - V, pr - V / 2));
    c.imageSmoothingEnabled = false; c.clearRect(0, 0, S, S); c.drawImage(mmBase.get(w), sx, sy, V, V, 0, 0, S, S); const k = S / V;
    for (const ex of w.exits || []) { if (!ex.to) continue; c.fillStyle = "rgba(255,244,207,.9)"; c.fillRect((ex.c0 - sx) * k, (ex.r0 - sy) * k, (ex.c1 - ex.c0 + 1) * k, (ex.r1 - ex.r0 + 1) * k); }
    if (e.grind.on) for (const m of e.grind.mobs) { c.fillStyle = m.sp.tier === "boss" ? "#ff5a4a" : m.sp.tier === "sub" ? "#ffb04a" : "#e8584a"; c.beginPath(); c.arc((m.x / T - sx) * k, (m.y / T - sy) * k, m.sp.tier === "mob" ? 3 : 5, 0, 6.3); c.fill(); }
    c.fillStyle = "#fff"; c.strokeStyle = "#1d1722"; c.lineWidth = 2; c.beginPath(); c.arc((pc - sx) * k, (pr - sy) * k, 5, 0, 6.3); c.fill(); c.stroke();
  }
  api.logLine = (t, kind) => { log.push({ t, kind }); if (log.length > 40) log.shift(); const d = mk("p", "hd-ll " + (kind || ""), t); logEl.append(d); while (logEl.children.length > 4) logEl.firstChild.remove(); setTimeout(() => d.classList.add("old"), 5000); setTimeout(() => d.remove(), 9000); if (tab === "log" && open) renderBody(); };
  // area banner
  const banner = mk("div", "hd-area gm-hidden"); hud.append(banner); let bt = 0;
  api.areaTitle = (id, w) => { const z = zoneById(id); banner.replaceChildren(mk("small", "", z ? `Lv ${z.lv[0]}–${z.lv[1]}` : "Safe area"), mk("b", "", AREA_NAMES[id] || id), mk("small", "", w?.mood || "")); banner.classList.remove("gm-hidden"); banner.classList.remove("show"); void banner.offsetWidth; banner.classList.add("show"); clearTimeout(bt); bt = setTimeout(() => banner.classList.add("gm-hidden"), 3200); api.logLine(`Entered ${AREA_NAMES[id] || id}.`, "sys"); };

  let slow = 0;
  api.frame = () => {
    const e = getEngine(), sim = eco.now(), m = minuteOfDay(sim), hr = getHero(eco), st = statsOf(eco), g = e?.grind, need = expToNext(hr.lv);
    lvB.textContent = hr.lv; pw.textContent = "⚔ " + powerOf(st); const gate = gateOf(eco); xpI.style.width = (hr.lv >= MAX_LEVEL || gate ? 100 : Math.min(100, hr.exp / need * 100)).toFixed(1) + "%"; xpI.classList.toggle("gate", !!gate); xpT.textContent = hr.lv >= MAX_LEVEL ? "MAX" : gate ? (gate === "awaken" ? "AWAKEN" : "BREAKTHROUGH") : (hr.exp / need * 100).toFixed(1) + "%"; hero.classList.toggle("gated", !!gate);
    hpI.style.width = Math.max(0, Math.min(100, hr.hp / st.maxHp * 100)).toFixed(1) + "%"; hpT.textContent = `${Math.ceil(hr.hp)}/${st.maxHp}`; { const q = hr.qi ?? st.qiCap; qiI.style.width = Math.max(0, Math.min(100, q / st.qiCap * 100)).toFixed(1) + "%"; qiT.textContent = `${Math.floor(q)}/${st.qiCap}`; } xcT.textContent = "◈ " + fmt(eco.wallet()) + " xc";
    dayT.textContent = `Day ${dayIndex(sim) + 1} · ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
    const q = eco.questList(); dot.classList.toggle("gm-hidden", !q.some((x) => x.done && !x.claimed));
    if (e) {
      const w = e.world, z = zoneById(e.areaId); zName.textContent = AREA_NAMES[e.areaId] || "Area"; zLv.textContent = z ? `Lv ${z.lv[0]}–${z.lv[1]}` : "Safe area · no monsters"; zMood.textContent = w.mood || ""; drawAvatar(); minimap(e);
      const on = !!g?.on, sp = speciesById(hr.species), here = e.areaId === sp.z;
      pill.classList.toggle("on", on); pillTxt.textContent = on ? (g.status === "rest" ? "Auto is resting — tap to stop" : "Auto is working — tap to stop") : (e.busy ? "Travelling…" : here || !z ? `Auto off — tap to hunt ${sp.name}` : `Auto off — tap to travel & hunt ${sp.name}`);
      autoB.classList.toggle("on", on); autoSub.textContent = on ? (g.status === "rest" ? "REST" : g.status === "fight" ? "FIGHT" : "HUNT") : "OFF";
      const rec = skillRec(eco); modeB.classList.toggle("on", rec.auto); modeB.textContent = rec.auto ? "SKILLS · AUTO" : "SKILLS · MANUAL";
      { const P = g?.ringPower?.() || 0, cd = g?._aura ?? g?.cd?._aura ?? 0; auraB.classList.toggle("gm-hidden", P <= 0); const c2 = g?.cd?._aura || 0; auraB.classList.toggle("cd", c2 > 0); auraB.classList.toggle("ready", P > 0 && c2 <= 0 && on); auraB.style.setProperty("--k", c2 > 0 ? (c2 / (g.cdMax._aura || c2)).toFixed(3) : "0"); auraT.textContent = c2 > 0 ? String(Math.ceil(c2)) : ""; }
      for (let i = 0; i < SLOT_COUNT; i++) { const id = rec.slots[i], sk = SKILL[id], el = slotEls[i], cd = (id && g?.cd[id]) || 0, ch = g?.chant && g.chant.id === id;
        if (slotIds[i] !== (id || "")) { slotIds[i] = id || ""; el.ic.innerHTML = sk ? skillIcon(sk.m, sk.c, 46) : ICON.plus; el.nm.textContent = ""; el.b.classList.toggle("empty", !sk); el.b.style.setProperty("--tc", sk ? `rgb(${sk.col})` : "#fff"); }
        el.t.textContent = ch ? "…" : cd > 0 ? String(Math.ceil(cd)) : ""; el.b.classList.toggle("cd", cd > 0); el.b.classList.toggle("chant", !!ch); el.b.style.setProperty("--k", cd > 0 ? (cd / (g.cdMax[id] || cd)).toFixed(3) : "0"); el.b.classList.toggle("ready", !!sk && cd <= 0 && !ch && on); }
      // targets
      const list = on ? [...g.mobs].sort((a, b) => Math.hypot(a.x - e.player.x, a.y - e.player.y) - Math.hypot(b.x - e.player.x, b.y - e.player.y)).slice(0, 4) : [];
      targets.replaceChildren(...list.map((t) => mk("div", "hd-t" + (t === g.target ? " cur" : "") + " " + t.sp.tier, mk("b", "", `Lv ${t.lv}`), mk("span", "", t.sp.name), mk("div", "hd-tb", h("i", { style: `width:${Math.max(0, t.hp / t.max * 100).toFixed(0)}%` })))));
      hud.classList.toggle("boss-on", !!(g?.on && g.target && g.target.sp.tier !== "mob" && g.mobs.includes(g.target)));
    }
    if (++slow % 4 === 0) { treeDot.classList.toggle("gm-hidden", pointsOf(eco).free < NODE_COST); bookDot.classList.toggle("gm-hidden", !SKILLS.some((k) => k.cls !== "basic" && canUnlock(eco, k.id, eco.catalog, hr.lv).ok)); }
    if (slow % 4 === 0 && open && (tab === "quest" || tab === "hero")) renderBody();
  };
  return { frame: api.frame };
}
