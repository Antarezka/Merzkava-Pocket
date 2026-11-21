// Panels for the character-development systems: Meridians (stat node web) and Skill Book (learn / upgrade / equip into the 4 quick slots).
// Installed onto the game UI api by ui.js: installSkillPanels({ api, h, open, close, eco, audio, cat, getEngine }).
import { NODES, NODE, BRANCHES, branchOf, STAT, NODE_COST, LEVEL_CAP, TOTAL_LEVEL_POINTS, pointsOf, isActive, canActivate, activate, canRefund, refund, resetNodes, respecCost, statsOf, powerOf, describeFx, heroRec, SOURCES, ATTRS } from "./data/progression.js";
import { SKILLS, SKILL, CLASSES, CLASS, SLOT_COUNT, CLASS_COST, SWITCH_COST, FIRST_CLASS_LEVEL, tierLabel, skillRec, classRec, activeClass, ownsClass, isUnlocked, booksOf, costOf, canUnlock, unlock, usable, setSlot, setAuto, skillsOfClass, canAcquireClass, acquireClass, switchClass } from "./data/skills.js";
import { skillIcon } from "./art/icons.js";
import { getHero } from "./data/mobs.js";
import { AREA_NAMES } from "./data/areas.js";

const fx2 = (n) => (Math.round(n * 100) / 100).toString();
const REASON = { locked: "Next to an active node first.", points: `Not enough stat points (${NODE_COST} per node).`, active: "Already active.", needed: "Other active nodes depend on this one.", no_funds: "Not enough xc.", empty: "Nothing to reset." };

export function installSkillPanels({ api, h, open, close, eco, audio, cat, getEngine }) {
  // ======================================================================= MERIDIANS
  const view = { x: 0, y: 0, k: 0.52 };      // survives redraws (pan / zoom)
  let sel = "origin";
  api.openTree = () => {
    open("MERIDIANS", { sub: "", tabs: [["web", "Meridian web"], ["stats", "Final stats"]], render(tab, redraw, subEl) {
      const hero = getHero(eco), pt = pointsOf(eco); subEl.textContent = `Lv ${hero.lv}/${LEVEL_CAP} · ${pt.free} free pts`;
      if (tab === "stats") return statsTab();
      const head = h("div", { class: "mt-head" },
        h("div", null, h("b", null, `${pt.free}`), h("small", null, "free points")), h("div", null, h("b", null, `${pt.nodes}`), h("small", null, "nodes active")),
        h("div", null, h("b", null, `+${3}`), h("small", null, "points / level")), h("button", { class: "gm-btn sm rose", disabled: !pt.nodes, onclick: (e) => { const b = e.currentTarget, c = respecCost(eco); if (b.dataset.arm !== "1") { b.dataset.arm = "1"; b.textContent = `CONFIRM · ${c} xc`; setTimeout(() => { if (b.isConnected) { b.dataset.arm = ""; b.textContent = "RESET"; } }, 3000); return; } const r = resetNodes(eco); if (r.ok) { audio.ok(); api.toast(`Meridians reset · −${r.cost} xc · ${pt.spent} points refunded`); } else { audio.no(); api.toast(REASON[r.reason] || "Can't reset."); } redraw(); } }, "RESET"));
      const cv = h("canvas", { class: "mt-cv" }), card = h("div", { class: "gp-card mt-card" }), hint = h("p", { class: "gc-note" }, "Drag to move · pinch or +/− to zoom · tap a node. A node can be activated when it touches an active one. Only ACTIVE nodes give stats.");
      const zoom = h("div", { class: "mt-zoom" }, ...[["+", 1.3], ["−", 1 / 1.3]].map(([t, f]) => h("button", { onclick: () => { view.k = Math.max(0.16, Math.min(1.8, view.k * f)); draw(); } }, t)), h("button", { onclick: () => { view.x = 0; view.y = 0; view.k = 0.52; draw(); } }, "⌖"));
      const wrap = h("div", { class: "mt-wrap" }, cv, zoom);
      let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), raf = 0;
      const toScreen = (n) => [W / 2 + (n.x - view.x) * view.k, H / 2 + (n.y - view.y) * view.k];
      function draw() {
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
          if (!cv.isConnected) return; const r = cv.getBoundingClientRect(); const lw = cv.offsetWidth, lh = cv.offsetHeight; if (!lw) return; if (cv.width !== Math.round(lw * dpr) || cv.height !== Math.round(lh * dpr)) { cv.width = Math.round(lw * dpr); cv.height = Math.round(lh * dpr); }
          W = lw; H = lh; const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
          const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, "#2a2238"); g.addColorStop(1, "#15101c"); c.fillStyle = g; c.fillRect(0, 0, W, H);
          // faint rings
          c.strokeStyle = "rgba(255,243,220,.05)"; c.lineWidth = 1; for (let k = 1; k <= 10; k++) { const R = (96 + k * 74) * view.k; c.beginPath(); c.arc(W / 2 - view.x * view.k, H / 2 - view.y * view.k, R, 0, 6.2832); c.stroke(); }
          const free = pointsOf(eco).free >= NODE_COST, t = performance.now() / 1000;
          c.lineCap = "round"; const drawn = new Set();
          for (const n of NODES) for (const l of n.links) { const key = n.id < l ? n.id + l : l + n.id; if (drawn.has(key)) continue; drawn.add(key); const m = NODE[l], a = toScreen(n), b = toScreen(m), on = isActive(eco, n.id) && isActive(eco, m.id), half = isActive(eco, n.id) || isActive(eco, m.id);
            if ((a[0] < -40 && b[0] < -40) || (a[0] > W + 40 && b[0] > W + 40) || (a[1] < -40 && b[1] < -40) || (a[1] > H + 40 && b[1] > H + 40)) continue;
            c.strokeStyle = on ? "#f2d889" : half ? "rgba(255,243,220,.38)" : "rgba(255,243,220,.14)"; c.lineWidth = (on ? 3.2 : 1.6) * Math.max(0.7, view.k * 1.6); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
          for (const n of NODES) { const [x, y] = toScreen(n); if (x < -30 || x > W + 30 || y < -30 || y > H + 30) continue;
            const act = isActive(eco, n.id), can = !act && canActivate(eco, n.id).ok, adj = !act && n.links.some((l) => isActive(eco, l)), br = n.branch ? branchOf(n.branch) : null, col = br?.col || "#f2d889", rad = (n.key ? 15 : n.id === "origin" ? 17 : 10) * Math.max(0.55, Math.min(1.4, view.k * 1.5));
            if (can) { c.strokeStyle = col; c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4); c.lineWidth = 3; c.beginPath(); c.arc(x, y, rad + 5, 0, 6.2832); c.stroke(); c.globalAlpha = 1; }
            c.beginPath(); if (n.key || n.id === "origin") { for (let i = 0; i < 8; i++) { const a = i * 0.7854 + 0.3927, rr = i % 2 ? rad * 0.78 : rad; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); } else c.arc(x, y, rad, 0, 6.2832);
            c.fillStyle = act ? col : adj ? "#3c3248" : "#2a2234"; c.fill(); c.lineWidth = n.id === sel ? 3.5 : 2; c.strokeStyle = n.id === sel ? "#fff" : act ? "#fff4cf" : adj ? col : "rgba(255,243,220,.25)"; c.stroke();
            if (act && view.k > 0.4) { c.fillStyle = "rgba(20,14,28,.75)"; c.beginPath(); c.arc(x, y, rad * 0.34, 0, 6.2832); c.fill(); } }
        });
      }
      let drag = null; const ptrs = new Map(), tapSlop = 6;
      cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0, d0: ptrs.size === 2 ? pinch() : 0, k0: view.k }; });
      const pinch = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
      cv.addEventListener("pointermove", (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (!drag) return;
        if (ptrs.size === 2) { if (!drag.d0) drag.d0 = pinch(); view.k = Math.max(0.16, Math.min(1.8, drag.k0 * pinch() / drag.d0)); drag.moved = 99; draw(); return; }
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); view.x = drag.vx - dx / view.k; view.y = drag.vy - dy / view.k; draw(); });
      const up = (e) => { ptrs.delete(e.pointerId); if (!drag) return; if (drag.moved < tapSlop && !ptrs.size) { const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; let best = null, bd = 1e9; for (const n of NODES) { const [x, y] = toScreen(n), d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = n; } } if (best && bd < 26) { sel = best.id; audio.tap(); showCard(); draw(); } } if (!ptrs.size) drag = null; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      cv.addEventListener("wheel", (e) => { e.preventDefault(); view.k = Math.max(0.16, Math.min(1.8, view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); draw(); }, { passive: false });
      function showCard() {
        const n = NODE[sel] || NODE.origin, br = n.branch ? branchOf(n.branch) : null, act = isActive(eco, n.id), can = canActivate(eco, n.id), lines = describeFx(n.fx);
        const btns = []; if (n.id !== "origin") {
          if (!act) btns.push(h("button", { class: "gm-btn sm", disabled: !can.ok, onclick: () => { const r = activate(eco, n.id); if (r.ok) { audio.ok(); api.toast(`${n.name} activated`); } else { audio.no(); api.toast(REASON[r.reason]); } redraw(); } }, `ACTIVATE · ${NODE_COST} pts`), !can.ok ? h("small", { class: "mt-why" }, REASON[can.reason] || "") : null);
          else btns.push(h("button", { class: "gm-btn sm rose", disabled: !canRefund(eco, n.id), onclick: () => { const r = refund(eco, n.id); if (r.ok) { audio.ok(); api.toast(`${n.name} refunded · −${r.cost} xc`); } else { audio.no(); api.toast(REASON[r.reason]); } redraw(); } }, "REFUND · 0.6 xc"), !canRefund(eco, n.id) ? h("small", { class: "mt-why" }, "Other active nodes depend on this one.") : null);
        }
        card.replaceChildren(h("h4", null, h("i", { class: "mt-dot", style: `background:${br?.col || "#f2d889"}` }), n.name, n.key ? h("small", { class: "mt-key" }, "KEYSTONE") : null), h("p", null, br ? `${br.name} path · ring ${n.ring}` : "The centre of every path — always active."), lines.length ? h("p", { class: "mt-fx" }, lines.join("   ")) : h("p", null, "Gives nothing itself."), h("p", { class: "mt-st" }, act || n.id === "origin" ? "● ACTIVE" : can.ok ? "○ Available" : n.links.some((l) => isActive(eco, l)) ? "○ Needs points" : "○ Locked"), ...btns.filter(Boolean));
      }
      showCard(); requestAnimationFrame(() => { draw(); setTimeout(draw, 60); }); const rs = new ResizeObserver(() => draw()); rs.observe(cv); const anim = setInterval(() => { if (!cv.isConnected) { clearInterval(anim); rs.disconnect(); return; } draw(); }, 120);
      return [head, wrap, card, hint];
    } });
    function statsTab() {
      const st = statsOf(eco), pt = pointsOf(eco), row = (k, v, sub) => h("div", { class: "gp-line" }, h("span", null, k, sub ? h("small", null, sub) : null), h("b", null, v));
      const src = Object.entries(SOURCES).map(([id, f]) => { const s = f(eco), parts = [...describeFx(s)]; return h("div", { class: "gp-card" }, h("h4", null, id[0].toUpperCase() + id.slice(1)), h("p", null, parts.length ? parts.join(" · ") : id === "nodes" ? "No active nodes yet." : "Not implemented yet — reserved slot for this system.")); });
      return [h("div", { class: "gp-card" }, h("h4", null, `Power ${powerOf(st)}`), h("p", null, `Level points ${pt.total} (3 per level, ${TOTAL_LEVEL_POINTS} total at Lv ${LEVEL_CAP}) · spent ${pt.spent} · free ${pt.free}. Levelling up never raises an attribute by itself.`)),
        h("div", { class: "gs-sec" }, "FINAL ATTRIBUTES"), ...ATTRS.map((a) => row(STAT[a][0], fx2(st.attrs[a]), STAT[a][2])),
        h("div", { class: "gs-sec" }, "COMBAT"), row("Max HP", st.maxHp), row("ATK", fx2(st.atk)), row("DEF", fx2(st.def)), row("Swing", `${st.speed.toFixed(2)}s`), row("Crit", `${fx2(st.crit)}% · ×${fx2(st.critDmg / 100)}`), row("Evade", `${fx2(st.evade)}%`), row("Chant Time Reduction", `${fx2(st.cdr)}%`), row("Skill damage", `+${fx2(st.skillPct)}%`), row("HP regen", `${fx2(st.regen)}%/s`), row("EXP gain", `+${fx2(st.expPct)}%`), row("Loot & book luck", `+${fx2(st.dropPct)}%`),
        h("div", { class: "gs-sec" }, "WHERE IT COMES FROM"), ...src, h("p", { class: "gc-note" }, "Final stat = combined base stats + modifiers from every source. Percent modifiers (cultivation bonuses and penalties) are applied on top of the flat totals.")];
    }
  };

  // ======================================================================= SKILLS: Skill Library (everything unlocked, equip into the 4 slots) + class Skill Book (ACTIVE class only)
  let slotSel = 0, bookSel = null; const ic = (sk, n = 44) => h("span", { class: "sk-wrap", html: skillIcon(sk.m, sk.c, n) });
  const typeText = (sk, st) => sk.type === "heal" ? `Heals ${Math.round(sk.heal * 100)}% HP` : sk.type === "buff" ? Object.entries(sk.buff).filter(([k]) => k !== "dur").map(([k, v]) => `+${Math.round(v * 100)}% ${k.toUpperCase()}`).join(" ") + ` · ${sk.buff.dur}s` : `${sk.hits > 1 ? sk.hits + " × " : ""}${fx2(sk.mult * (1 + st.skillPct / 100))}× ATK${sk.type === "aoe" ? " · area" : ""}`;
  api.openSkills = (tab0) => {
    const tabs = () => [["library", "Skill Library"], ...(activeClass(eco) ? [["book", "Class Skill Tree"]] : [])];
    open("SKILLS", { sub: "", tabs: tabs(), initial: tab0 === "book" && activeClass(eco) ? "book" : "library", render(tab, redraw, subEl) {
      const r = skillRec(eco), st = statsOf(eco), lvl = getHero(eco).lv, cls = activeClass(eco); subEl.textContent = cls ? `${cls.name} · Lv ${lvl}` : `Unclassed · Lv ${lvl}`;
      if (tab === "book" && cls) return bookTab(r, st, lvl, cls, redraw);
      const slots = h("div", { class: "sb-slots" }, ...Array.from({ length: SLOT_COUNT }, (_, i) => { const sk = SKILL[r.slots[i]]; return h("button", { class: "sb-slot" + (i === slotSel ? " on" : ""), onclick: () => { audio.tap(); slotSel = i; redraw(); } }, sk ? ic(sk, 40) : h("span", { class: "sb-empty" }, "+"), h("small", null, sk ? sk.short : `SLOT ${i + 1}`)); }));
      const mode = h("div", { class: "sb-mode" }, h("span", null, h("b", null, r.auto ? "Auto skills" : "Manual skills"), h("small", null, r.auto ? "Slots fire on their own while Auto is on." : "Slots only fire when you tap them.")), h("button", { class: "gm-btn sm", onclick: () => { audio.tap(); setAuto(eco, !r.auto); redraw(); } }, r.auto ? "MANUAL" : "AUTO"));
      const known = SKILLS.filter((s) => r.owned[s.id]);
      const list = known.map((sk) => { const eq = r.slots.indexOf(sk.id), u = usable(eco, sk.id);
        return h("div", { class: "sb-row" + (u.ok ? "" : " dim") }, ic(sk), h("div", { class: "sb-info" }, h("b", null, sk.name, sk.ult ? h("em", { class: "sb-ult" }, "ULTIMATE") : null), h("small", null, `${typeText(sk, st)} · ${sk.cd}s cd · ${fx2(sk.chant * (1 - st.cdr / 100))}s chant`), !u.ok ? h("small", { class: "mt-why" }, u.why) : null),
          eq === slotSel ? h("button", { class: "gm-btn sm ghost", onclick: () => { audio.tap(); setSlot(eco, slotSel, null); redraw(); } }, `SLOT ${slotSel + 1} ✕`) : h("button", { class: "gm-btn sm", onclick: () => { audio.tap(); setSlot(eco, slotSel, sk.id); redraw(); } }, eq >= 0 ? `→ ${slotSel + 1}` : `EQUIP ${slotSel + 1}`)); });
      return [slots, mode, ...list, h("p", { class: "gc-note" }, cls ? "Everything you unlock stays here and can be equipped whatever class is active. Ultimates only work while their own class is active." : "You are Unclassed. Reach Lv 9, then find the Class Change NPC in the Village to begin a class and its Skill Book.")];
    } });
  };
  function bookTab(r, st, lvl, cls, redraw) {
    const list = skillsOfClass(cls.id), reg = list.filter((s) => !s.ult), ult = list.filter((s) => s.ult), sel = SKILL[bookSel] && SKILL[bookSel].cls === cls.id ? SKILL[bookSel] : reg[0];
    const node = (sk) => { const done = isUnlocked(eco, sk.id), can = canUnlock(eco, sk.id, cat, lvl), near = !done && lvl >= sk.lv && (!sk.parent || isUnlocked(eco, sk.parent));
      return h("button", { class: "bk-node" + (done ? " done" : near ? " near" : " far") + (sk === sel ? " sel" : ""), onclick: () => { audio.tap(); bookSel = sk.id; redraw(); } }, ic(sk, 46), h("small", null, done ? "✓" : `Lv ${sk.lv}`)); };
    const row = (arr) => h("div", { class: "bk-row" }, ...arr.flatMap((s, i) => (i ? [h("i", { class: "bk-link" + (isUnlocked(eco, s.parent || "") ? " on" : "") }), node(s)] : [node(s)])));
    const done = isUnlocked(eco, sel.id), c = canUnlock(eco, sel.id, cat, lvl), cost = costOf(sel);
    const req = (ok, t) => h("span", { class: "sb-req" + (ok ? " ok" : "") }, (ok ? "✓ " : "✗ ") + t);
    const detail = h("div", { class: "gp-card bk-detail" }, h("div", { class: "bk-dh" }, ic(sel, 54), h("div", null, h("h4", null, sel.name, sel.ult ? h("em", { class: "sb-ult" }, `ULTIMATE ${sel.ult}`) : null), h("small", null, `${tierLabel(sel)[0]} · ${typeText(sel, st)} · ${sel.cd}s cd`))), h("p", null, sel.ult ? "A signature technique. It unlocks here, but only works while this class is active." : sel.desc),
      done ? h("p", { class: "sb-req ok" }, "✓ Unlocked — equip it in the Skill Library.") : h("div", { class: "sb-reqs" }, req(true, "Class: " + cls.name), req(lvl >= sel.lv, `Level ${sel.lv}`), sel.parent ? req(isUnlocked(eco, sel.parent), SKILL[sel.parent].name) : null, req(booksOf(eco, sel.id) >= cost.books, `Skill books ${booksOf(eco, sel.id)}/${cost.books}`), ...cost.mats.map(([n, q]) => { const it = cat.byName(n); return req(it && eco.total(it.item_id) >= q, `${n} ${fx2(Math.min(q, it ? eco.total(it.item_id) : 0))}/${q}`); })),
      done ? null : h("button", { class: "gm-btn", disabled: !c.ok, onclick: () => { const x = unlock(eco, sel.id, cat, lvl); if (x.ok) { audio.ok(); api.toast(`${sel.name} unlocked`); } else { audio.no(); api.toast("Missing: " + c.reasons.join(", ")); } redraw(); } }, "UNLOCK"));
    return [h("div", { class: "bk-head" }, h("span", { class: "sk-wrap", html: skillIcon(cls.m, cls.c, 52) }), h("div", null, h("b", null, cls.name), h("small", null, `${cls.weapon} · ${cls.identity}`))),
      h("div", { class: "gs-sec" }, "CLASS SKILL TREE"), h("div", { class: "bk-map" }, row(reg), h("div", { class: "gs-sec", style: "margin-top:10px" }, "SIGNATURE ULTIMATES · Lv 100 / 300 / 404 / 666"), row(ult)), detail,
      h("p", { class: "gc-note" }, "Level milestones make a skill eligible — you still need the class, the previous skill and its materials. Skill books drop from monsters; other materials come from the hunting zones. Only your active class's book is shown.")];
  }
  // ======================================================================= CLASS CHANGE (the Class Change NPC opens this)
  api.openClasses = () => {
    open("CLASS CHANGE", { sub: "", render(tab, redraw, subEl) {
      const lvl = getHero(eco).lv, cr = classRec(eco), act = cr.active; subEl.textContent = `${eco.wallet().toFixed(2)} xc`;
      return [h("p", { class: "gc-note", style: "margin:0 0 8px" }, `You can own several classes but only one is active. Beginning a class costs ${CLASS_COST} xc (from Lv ${FIRST_CLASS_LEVEL}); switching costs ${SWITCH_COST} xc. Class progress and unlocked skills are never lost.`),
        ...CLASSES.map((c) => { const own = ownsClass(eco, c.id), isAct = act === c.id, can = canAcquireClass(eco, c.id, lvl);
          return h("div", { class: "sb-row" + (isAct ? " act" : "") }, h("span", { class: "sk-wrap", html: skillIcon(c.m, c.c, 46) }), h("div", { class: "sb-info" }, h("b", null, c.name), h("small", null, `${c.weapon} · ${c.identity}`)),
            isAct ? h("em", { class: "sb-ult" }, "ACTIVE") : own ? h("button", { class: "gm-btn sm", onclick: () => { const x = switchClass(eco, c.id); if (x.ok) { audio.ok(); api.toast(`Class: ${c.name}`); } else { audio.no(); api.toast(x.reason === "funds" ? "Not enough xc." : "Can't switch."); } redraw(); } }, "SWITCH")
            : h("button", { class: "gm-btn sm", disabled: !can.ok, onclick: () => { const x = acquireClass(eco, c.id, lvl); if (x.ok) { audio.ok(); api.toast(`You begin the ${c.name} path.`); } else { audio.no(); api.toast(x.reason === "level" ? `Reach Lv ${FIRST_CLASS_LEVEL} first.` : "Not enough xc."); } redraw(); } }, can.ok || can.reason === "funds" ? "BEGIN" : `Lv ${FIRST_CLASS_LEVEL}`)); })];
    } });
  };
}
