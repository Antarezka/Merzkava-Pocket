// Character hub (Overview · Origin · Guanghuan · Node System · Class · Achievements), the Awakening rite, the Academy hand-ins,
// the absorption ticker (satiety, upkeep, Aura Repulsion interruptions, breakthrough) and the developer helpers for all of it.
// Installed by ui.js: installCharPanels({ api, h, open, close, eco, audio, cat, getEngine, layer, hud }).
import { getHero, expToNext, addExp, ROSTER, MAX_LEVEL } from "./data/mobs.js";
import { statsOf, pointsOf } from "./data/progression.js";
import { activeClass, classRec, CLASS, skillsOfClass, isUnlocked, addBooks, SKILL } from "./data/skills.js";
import { REALMS, STAGES, stageRange, realmOf, stageOf, title, cult, gateOf, passedOf, ROUTES, RARITY, rollInnateOrigin, mutateInnateOrigin, awaken, elementOf, gradeOf, originAbility, partOf, gradeYears, SAT, foodList, foodCount, eat, satOf,
  canAbsorb, startAbsorb, tickAbsorb, resolveAura, abortAbsorb, upkeepsNeeded, absorbMin, tickSatiety, rollBeastOrigin, targetSlot, slotStates, absorbDays, BEAST_CATS, BEAST_TRAITS } from "./data/realms.js";
import { realMsToSimMin, simMinToRealMs } from "./data/clock.js";
import { createAura } from "./aura.js";

const fmt = (n) => (Math.round(n * 100) / 100).toString();
const price = (s) => (s >= 100 ? `${Math.floor(s / 100)} Xuan Gold${s % 100 ? ` ${s % 100} Xuan Silver` : ""}` : `${s} Xuan Silver`);
const NO = { awaken: "Awaken your Origin first.", no_gate: "No Guanghuan slot is open yet — reach your realm's level cap first.", prev_slot: "The preceding Guanghuan slot must be occupied first.", no_slot: "You need an Origin taken from an Origin Beast with Origin Devourer.", busy: "An Origin is already being absorbed." };
const SQS = [{ id: "copyist", name: "The Copyist's Errand", need: [["Writing Paper", 6]], books: 2, blurb: "The registrar has run out of paper." }, { id: "lamps", name: "Lamps for the Archive", need: [["Lantern Oil", 4], ["Candle", 2]], books: 3, blurb: "The reading hall goes dark at dusk." },
  { id: "herbs", name: "Pressed Herbs", need: [["Wild Angelica", 5]], books: 3, blurb: "The scholars press herbs between the pages." }];

export function installCharPanels({ api, h, open, close, eco, audio, music, getOpts, cat, getEngine, layer, hud }) {
  const aura = createAura({ h, root: layer, audio, music, getOpts }), C = () => cult(eco), bar = (f, col) => h("div", { class: "cu-bar" }, h("i", { style: `width:${Math.max(0, Math.min(100, f * 100)).toFixed(1)}%;background:${col || "var(--acc)"}` }));
  const partDot = (o, s = 38) => h("span", { class: "cu-ring", title: partOf(o.grade).name, style: `--c:${elementOf(C().innate || {}).col};width:${s}px;height:${s}px` }, String(o.grade));
  const kv = (k, v, col) => h("div", { class: "gs-row cu-kv" }, h("div", null, h("b", null, k)), h("span", { class: "ar-v", style: col ? `color:${col}` : "" }, v));

  // ------------------------------------------------------------------ absorption: HUD card + ticker
  const abFill = h("i"), abTxt = h("small"), abTitle = h("b"), abEl = h("div", { class: "cu-ab gm-hidden" }, h("div", { class: "cu-ab-h" }, abTitle, h("button", { type: "button", class: "gm-btn sm ghost", onclick: () => { audio.tap(); confirmAbort(); } }, "ABORT")), h("div", { class: "cu-bar" }, abFill), abTxt);
  hud.append(abEl); let locked = false, warned = false;
  const lock = (on) => { const e = getEngine(); if (!e || on === locked) return; locked = on; e.lock = Math.max(0, (e.lock || 0) + (on ? 1 : -1)); e.meditating = on; if (on) { e.grind.setOn(false); e.cancelAction?.(); e.player.path = []; e.player.moving = false; } };
  function confirmAbort() { api.say([{ text: "Abort the absorption? The Origin is lost for good (no injury), and you will have to hunt another.", choices: ["Keep absorbing", "Abort"] }]).then((r) => { if (r === 1 && abortAbsorb(eco)) { lock(false); api.toast("Absorption aborted — the Origin is gone."); } }); }
  async function playAura() {
    api.toast("Intruders approach your meditation!"); const r = await aura.play({ realm: Math.max(1, C().absorb?.slot || targetSlot(eco) || 1), foe: Math.random() < 0.5 ? "bandits" : "beasts" }); finishAura(r.passed);
  }
  function finishAura(passed) { const lost = resolveAura(eco, passed); api.toast(passed ? "Intruders repelled — your pack is safe." : lost.length ? "Stolen: " + lost.map((x) => `${x.n}× ${x.name}`).join(", ") : "The intruders found nothing worth taking."); }
  const hooks = {
    onUpkeep: (it) => api.toast(`Satiety upkeep — ate ${it.name}.`), onEvent: (ev, late) => { if (late) finishAura(false); else playAura(); },
    onDone: async (res) => { lock(false); const hr = getHero(eco);
      if (res.ok) { hr.hp = statsOf(eco).maxHp; hr.nearDeath = false; const up = addExp(eco, 0); eco.changed?.(); audio.ok?.(); await api.say([`The Origin of ${res.origin.beastName} settles into your Guanghuan…`, res.first ? `GUANGHUAN INITIATE OPENS — Level ${res.lv}` : `BREAKTHROUGH — ${title(res.lv)}  ·  Level ${res.lv}`, `Guanghuan slot ${res.slot} is bound. ` + (res.first ? "Your first steps on the cultivation road are made." : "Your HP and Qi caps surge.") + (up ? ` The banked EXP carries you ${up} more level${up > 1 ? "s" : ""}.` : "")]); }
      else await api.say(["The Origin shatters in a flash of cold light.", res.why === "food" ? "You had nothing left to eat when the upkeep came due — the absorption failed." : "The absorption failed.", "Your body is left near death. Rest and recover before you try again."]); } };
  function tick() {
    const c = C(), now = Date.now(); if (c.absorb) { const e = getEngine(); if (e && !locked) lock(true); const r = tickAbsorb(eco, hooks), a = c.absorb;
      if (a) { const fr = r?.frac ?? Math.min(1, (eco.now() - a.t0) / a.dur), left = Math.max(0, a.t0 + a.dur - eco.now()); abEl.classList.remove("gm-hidden"); abTitle.textContent = `ABSORBING · ${a.origin.beastName.toUpperCase()} ORIGIN`; abFill.style.width = (fr * 100).toFixed(1) + "%";
        abTxt.textContent = `${Math.round(fr * 100)}% · about ${Math.max(1, Math.ceil(simMinToRealMs(left) / 60000))} min left · food ${a.used}/${upkeepsNeeded(eco)}`; } else abEl.classList.add("gm-hidden"); c.satAt = now; return; }
    abEl.classList.add("gm-hidden"); if (locked) lock(false);
    const dtMin = Math.min(360, realMsToSimMin(now - (c.satAt || now))); c.satAt = now; if (dtMin <= 0) return; const ate = tickSatiety(eco, dtMin);
    if (ate) api.toast(`Auto-ate ${ate.name}.`); if (c.sat < SAT.low && !warned && !foodList(eco).length) { warned = true; api.toast(c.sat <= 0 ? "You are starving! (−15% ATK, −10% HP)" : "You're hungry — carry some food."); } if (c.sat > SAT.low + 10) warned = false;
    const hr = getHero(eco); if (hr.nearDeath && hr.hp >= statsOf(eco).maxHp * 0.25) hr.nearDeath = false;
  }
  const loop = setInterval(tick, 500); api.charDestroy = () => { clearInterval(loop); abEl.remove(); };
  { const c = C(); if (c.absorb?.aura) { finishAura(false); } }   // the app was closed during an interruption: you didn't defend

  // ------------------------------------------------------------------ Character hub
  const NAMES = { ov: "Overview", innate: "Origin", slots: "Guanghuan", realms: "Realms", cls: "Class", ach: "Achievements" };
  api.openCharacter = (tab0 = "ov") => open("CHARACTER", { tabs: Object.entries(NAMES), initial: tab0, render(tab, redraw, subEl) {
    const hr = getHero(eco), c = C(); subEl.textContent = title(hr.lv); const draw = { ov, innate, slots, realms, cls, ach }[tab]; return draw(hr, c, redraw);
  } });

  function ov(hr, c, redraw) {
    const st = statsOf(eco), gate = gateOf(eco), need = expToNext(hr.lv), cls = activeClass(eco), bound = c.slots.filter(Boolean).length, rar = c.innate && RARITY[c.innate.rarity];
    return [h("div", { class: "cu-hero" }, h("div", null, h("b", null, eco.state.profile.name), h("small", null, `Level ${hr.lv} · ${title(hr.lv)}`)), h("span", { class: "cu-pw" }, "⚔ " + Math.round(st.atk * 12 + st.maxHp * 0.35))),
      bar(gate ? 1 : hr.exp / need, gate ? "#ff9f4a" : "var(--acc)"), h("p", { class: "gc-note" }, gate === "awaken" ? `EXP ${Math.floor(hr.exp)} banked — awaken your Origin at the Awakening Facility (Village) first.` : gate === "slot1" ? `EXP ${Math.floor(hr.exp)} banked — Guanghuan Slot 1 is open. Hunt an Origin Beast, absorb its Origin, and Guanghuan Initiate (Lv 2) opens.` : gate === "break" ? `Realm cap. EXP ${Math.floor(hr.exp)} is banked and will carry over after the breakthrough.` : `EXP ${Math.floor(hr.exp)} / ${need}`),
      kv("Awakening", c.innate ? "Awakened · record on file" : "Not Awakened", c.innate ? "var(--acc2)" : null), kv("Origin", c.innate ? `${c.innate.name} · ${rar.name}` : "Undiscovered", rar?.col),
      kv("Cultivation", hr.lv <= 1 ? (c.innate ? "Awakened · no Guanghuan Realm yet" : "Not Awakened · no Guanghuan Realm") : `${REALMS[realmOf(hr.lv).n - 1].name} · ${STAGES[stageOf(hr.lv)]}`), kv("Class", cls ? cls.name : "Unclassed"), kv("Guanghuan", `${bound} / 9 bound`),
      kv("HP cap / Qi cap", `${st.maxHp} / ${st.qiCap}`), kv("Stat points", `${pointsOf(eco).free} free`),
      h("div", { class: "cu-sat" }, h("div", { class: "cu-sat-h" }, h("b", null, "Satiety"), h("span", null, Math.round(c.sat) + "%")), bar(c.sat / 100, c.sat < SAT.low ? "#ff6a5a" : "#7fe0a0"),
        h("label", { class: "cu-chk" }, h("input", { type: "checkbox", checked: c.autoEat, onchange: (e) => { c.autoEat = e.target.checked; eco.changed?.(); } }), "Auto-eat when hungry (cheapest food first)")),
      h("div", { class: "gs-sec" }, "OPEN"), h("div", { class: "cu-quick" }, h("button", { class: "gm-btn alt sm", onclick: () => { audio.tap(); api.openTree(); } }, "NODE SYSTEM"), h("button", { class: "gm-btn alt sm", onclick: () => { audio.tap(); api.openSkills(); } }, "SKILL LIBRARY"), cls ? h("button", { class: "gm-btn alt sm", onclick: () => { audio.tap(); api.openSkills("book"); } }, "CLASS SKILL TREE") : null)];
  }
  function innate(hr, c) {
    if (!c.innate) return [h("div", { class: "cu-none" }, h("b", null, "NOT AWAKENED"), h("p", null, "Your Origin has not been discovered yet."), h("small", null, "At Level 1, visit the Awakening Facility in the Village and speak with the Awakening Official."))];
    const s = c.innate, r = RARITY[s.rarity], el = elementOf(s);
    return [h("div", { class: "cu-innate", style: `--c:${r.col};--e:${el.col}` }, h("div", { class: "cu-orb" }), h("div", null, h("small", null, r.name.toUpperCase() + (s.mutated ? " · MUTATED" : "")), h("b", null, s.name), h("small", null, `${el.name} affinity → ${el.attr.toUpperCase()}`))),
      kv("Rarity", r.name, r.col), kv("Inherent quality", `${s.quality} · ${gradeOf(s.quality)}`), bar(s.quality / 100, el.col), kv("Awakening roll", s.roll), kv("Proof Token", c.proof ? "Held ✓" : "—"), kv("Route", ROUTES.find((x) => x.id === c.route)?.name || "—"),
      h("p", { class: "gc-note" }, "Rarity and inherent quality are separate: a Common innate can be superb, and a Myth innate can be flawed.")];
  }
  function slots(hr, c, redraw) {
    const out = [], now = eco.now(), a = c.absorb, st9 = slotStates(eco), why = (i) => i === 0 ? "Opens after Origin Awakening." : `Opens at Lv ${REALMS[i - 1].hi} once Slot ${i} is occupied.`;
    st9.forEach((s9, i) => { const r = c.slots[i]; out.push(r ? originCard(r, `Slot ${i + 1} · `) : h("div", { class: "gp-card cu-slot" + (s9 === "open" ? " open" : "") }, h("span", { class: "cu-ring empty" }, "·"), h("div", null, h("h4", null, `Slot ${i + 1}` + (s9 === "open" ? " · AVAILABLE" : s9 === "off" ? " · disabled" : " · locked")), h("p", null, s9 === "open" ? "Empty — hunt an Origin Beast and absorb its Origin." : s9 === "off" ? "Not Awakened: every slot is disabled until your Origin awakens." : why(i))))); });
    out.unshift(h("div", { class: "gs-sec" }, "SLOTS"));
    if (a) { const fr = Math.min(1, (now - a.t0) / a.dur); out.push(h("div", { class: "gs-sec" }, "ABSORBING"), originCard(a.origin, ""), bar(fr), h("p", { class: "gc-note" }, `${Math.round(fr * 100)}% — the timer keeps running while you play, close the game or defend against intruders. Food used ${a.used}/${upkeepsNeeded(eco)}.`)); }
    else { out.push(h("div", { class: "gs-sec" }, "OBTAINED ORIGIN")); if (c.pending) { const ok = canAbsorb(eco); out.push(originCard(c.pending, ""), h("p", { class: "gc-note" }, `${targetSlot(eco) === 1 ? "Initial absorption" : "Breakthrough absorption"} for Slot ${targetSlot(eco) || "?"}: ${fmt(absorbMin(eco) / 1440)} in-game day(s) (${Math.round(simMinToRealMs(absorbMin(eco)) / 60000)} real min), ${upkeepsNeeded(eco)} food to be carried. Failure destroys the Origin and leaves you near death.`),
        h("button", { class: "gm-btn", disabled: !ok.ok, onclick: () => { audio.tap(); beginAbsorb(); } }, targetSlot(eco) === 1 ? "BEGIN INITIAL ABSORPTION" : "BEGIN ABSORPTION"), !ok.ok ? h("p", { class: "mt-why" }, ok.reason === "food" ? `Carry at least ${ok.need} food (you have ${ok.have}).` : NO[ok.reason]) : null); }
      else out.push(h("p", { class: "gc-note" }, st9.includes("open") ? "No Origin in hand. The open slot is waiting: defeat an Origin Beast (Origin Beast category and above — sub bosses and bosses carry them most often) and take its Origin with Origin Devourer — Forced Extraction, or Voluntary Surrender if it offers. Its age grade is only revealed once you hold the Origin." : "No slot is open, so no Origin can be claimed yet.")); }
    return out;
  }
  function originCard(o, label) {
    const part = partOf(o.grade), s = C().innate, ab = s ? originAbility(o, s) : null, tr = (o.traits || []).map((x) => BEAST_TRAITS.find((b) => b[0] === x)?.[1] || x);
    return h("div", { class: "gp-card cu-ringc" }, partDot(o), h("div", null, h("h4", null, `${label}Origin of ${o.beastName}`), h("p", null, `${BEAST_CATS[o.cat] || "Origin Beast"}${tr.length ? " · " + tr.join(", ") : ""}${o.method === "surrender" ? " · given willingly" : ""}`),
      h("p", null, `Age grade ${o.grade} · ${part.name} formed · ${gradeYears(o.grade)}`), h("p", null, `Existential cycle: life ${o.cycle?.now ?? 1} of ${o.cycle?.lives ?? 1}`), h("p", null, `Origin quality ${o.quality} (${gradeOf(o.quality)})`),
      h("p", { class: "cu-ab" }, ab ? `${ab.name}: +${ab.pct}% ${ab.attr.toUpperCase()} · +${ab.flat} ${ab.statName}` : "Its ability forms once your Origin awakens.")));
  }
  let nodeSel = null;
  function realms(hr, c, redraw) {
    const cur = realmOf(hr.lv).n, sel = nodeSel || cur, R = REALMS[sel - 1], gate = gateOf(eco), passed = passedOf(eco);
    const rows = REALMS.map((r) => { const done = passed >= r.n && r.n < 9 || (r.n === 9 && hr.lv >= 666), here = r.n === cur;
      return h("button", { class: "cu-node" + (here ? " here" : done ? " done" : r.n > cur ? " far" : "") + (r.n === sel ? " sel" : ""), onclick: () => { audio.tap(); nodeSel = r.n; redraw(); } }, h("span", { class: "cu-n" }, r.n), h("div", { class: "cu-nm" }, h("b", null, r.name), h("small", null, `Lv ${r.lo}–${r.hi}`)),
        h("div", { class: "cu-st" }, ...STAGES.map((s, i) => { const [lo] = stageRange(r.n, i); return h("i", { class: hr.lv >= lo ? "on" : "", title: s }); })), h("span", { class: "cu-gate" + (r.n === 9 ? " hid" : "") }, done ? "✓" : "◆")); });
    const eff = sel === 1 ? "Opens when Slot 1 is absorbed (Lv 2). Every stage reached: +0.4% to each attribute." : `Breakthrough into this realm: +12% HP, +6% ATK, +10% Qi cap, a bound Origin and slower hunger. Stages: +0.4% to each attribute.`;
    const detail = h("div", { class: "gp-card" }, h("h4", null, `${R.name} · Lv ${R.lo}–${R.hi}`), h("p", null, STAGES.map((s, i) => `${s} ${stageRange(sel, i).join("–")}`).join("  ·  ")), h("p", null, eff),
      sel < 9 ? h("p", null, `Gate at Lv ${R.hi} with Guanghuan Slot ${sel} occupied: Slot ${sel + 1} opens. Hunt an Origin Beast and absorb its Origin (${fmt(absorbDays(sel + 1))} in-game days). Level ${R.hi + 1} opens ${REALMS[sel].name}.`) : h("p", null, "Final realm — level cap 666."),
      sel === cur && gate === "break" ? h("button", { class: "gm-btn sm", onclick: () => { audio.tap(); nodeSel = null; open && api.openCharacter("slots"); } }, "GO TO GUANGHUAN") : null);
    return [h("div", { class: "gs-sec" }, "GUANGHUAN REALMS"), ...rows, detail, h("p", { class: "gc-note" }, "◆ = breakthrough gate. Level 1 is pre-awakening and outside the nine realms. Realm and stage are decided by level; each gate needs a Origin absorption. Stat points are spent in the Meridian Web.")];
  }
  function cls(hr) {
    const r = classRec(eco), a = activeClass(eco);
    return [kv("Current class", a ? a.name : "Unclassed"), ...(r.owned.length ? [h("div", { class: "gs-sec" }, "ACQUIRED"), ...r.owned.map((id) => kv(CLASS[id].name, id === r.active ? "Active" : "Owned", id === r.active ? "var(--acc2)" : null))] : []),
      h("p", { class: "gc-note" }, "Classes are acquired and changed only through the Class Change NPC in the Village — not from this menu. Your Class Skill Tree shows the active class only."), a ? h("button", { class: "gm-btn alt sm", onclick: () => { audio.tap(); api.openSkills("book"); } }, "OPEN CLASS SKILL TREE") : null];
  }
  const ACH = [["First Blood", "Defeat a monster.", (hr) => (hr.kills || 0) >= 1], ["Hundred Slain", "Defeat 100 monsters.", (hr) => (hr.kills || 0) >= 100], ["Thousand Slain", "Defeat 1,000 monsters.", (hr) => (hr.kills || 0) >= 1000],
    ["Awakened", "Awaken your Origin.", () => !!C().innate], ["Meridian Walker", "Activate 10 Meridian nodes.", (hr) => (hr.nodes || []).length >= 10], ["Bestiary Page", "Record 15 different monsters.", (hr) => Object.keys(hr.dex || {}).length >= 15],
    ["Origin Bearer", "Hold a Origin.", () => !!(C().pending || C().absorb || C().slots.some(Boolean))], ["First Breakthrough", "Break through to the second realm.", () => passedOf(eco) >= 1], ["Disciple", "Walk a class path.", () => !!activeClass(eco)], ["Level 50", "Reach Level 50.", (hr) => hr.lv >= 50]];
  function ach(hr) { const done = ACH.filter(([, , f]) => f(hr)).length; return [h("div", { class: "gs-sec" }, `ACHIEVEMENTS · ${done} / ${ACH.length}`), ...ACH.map(([n, d, f]) => { const ok = f(hr); return h("div", { class: "gp-card cu-ach" + (ok ? " ok" : "") }, h("span", null, ok ? "✓" : "·"), h("div", null, h("h4", null, n), h("p", null, d))); })]; }

  function beginAbsorb() {
    const r = startAbsorb(eco); if (!r.ok) { api.toast(r.reason === "food" ? `Carry at least ${r.need} food.` : NO[r.reason] || "Can't begin."); return; }
    close(); lock(true); audio.ok?.(); api.say(["You sit cross-legged, the Origin hovering before you…", "The absorption has begun. Keep food in your pack — every few hours the upkeep eats one."]);
  }

  // ------------------------------------------------------------------ Awakening rite (service route → roll → mutation choice → registration)
  api.talkAwakening = async (n) => {
    const npc = { model: n.model, view: "SW" }, say = (t, ch) => api.say([{ who: "npc", npc, name: n.name, text: t, choices: ch }]), c = C(), lv = getHero(eco).lv;
    if (c.innate) { await say("Your record is already in the Hall's register. " + (gateOf(eco) === "slot1" ? "Guanghuan Slot 1 stands open and empty — find an Origin Beast, and absorb the Origin it leaves behind." : "May your Origin grow strong.")); return; }
    if (lv > 1) { await say("The Hall awakens novices at Level 1 only. Your record is not in our register."); return; }
    const routes = ROUTES.filter((r) => !r.public || n.public), r = await say("Welcome to the Awakening Hall. You are Not Awakened — your Origin is still undiscovered, and every Guanghuan slot is closed to you until it is. Choose a service route.", [...routes.map((x) => `${x.name} — ${price(x.silver)}`), "Not now"]);
    if (r == null || r >= routes.length) return; const rt = routes[r];
    if (eco.wallet() + 1e-9 < rt.silver) { await say(`That route costs ${price(rt.silver)} (${rt.silver} xc). You carry ${fmt(eco.wallet())} xc. The fee covers the service, tax, documents and your Proof Token.`); return; }
    const sure = await say(`${rt.name}: ${price(rt.silver)}, Proof Token included. The route does not change the odds of your Origin. Shall we begin?`, ["Begin the Awakening", "Not yet"]); if (sure !== 0) return;
    const s = rollInnateOrigin(); const res = awaken(eco, rt.id, s); if (!res.ok) { api.toast("Not enough xc."); return; } await rite(s);
    const up = addExp(eco, 0); if (up) api.toast(`Your banked EXP carries you to Level ${getHero(eco).lv}!`); eco.changed?.();
  };
  function rite(s) {
    return new Promise((resolve) => {
      const card = h("div", { class: "rt-card" }), el = h("div", { class: "rt" }, card); layer.append(el);
      const col = () => RARITY[s.rarity].col, put = (...k) => card.replaceChildren(...k), btn = (t, fn, cls = "") => h("button", { class: "gm-btn " + cls, onclick: () => { audio.tap(); fn(); } }, t);
      const done = () => { el.classList.add("out"); setTimeout(() => { el.remove(); resolve(); }, 250); };
      const step0 = () => put(h("small", null, "AWAKENING STONE"), h("b", { class: "rt-big" }, "Lay your palm on the stone"), h("p", null, "Rarity is rolled from 1 to 100."), btn("TOUCH THE STONE", step1));
      const step1 = () => { const num = h("b", { class: "rt-num" }, "00"); put(h("small", null, "ROLLING…"), num); let i = 0; const t = setInterval(() => { num.textContent = String(1 + Math.floor(Math.random() * 100)).padStart(2, "0"); if (++i > 22) { clearInterval(t); num.textContent = String(s.roll).padStart(2, "0"); audio.ok?.(); setTimeout(step2, 700); } }, 55); };
      const step2 = () => { const el2 = elementOf(s); put(h("small", null, `ROLL ${s.roll}`), h("b", { class: "rt-big", style: `color:${col()};text-shadow:0 0 18px ${col()}` }, RARITY[s.rarity].name), h("div", { class: "cu-innate", style: `--c:${col()};--e:${el2.col}` }, h("div", { class: "cu-orb" }), h("div", null, h("b", null, s.name), h("small", null, `${el2.name} affinity · inherent quality ${s.quality} (${gradeOf(s.quality)})`))),
        h("p", null, "Accept this Origin, or risk a mutation: 10% rises one rarity · 30% backlash drops one · 60% nothing changes. You may try only once."), btn("ACCEPT", step4), btn("RISK MUTATION", step3, "rose")); };
      const step3 = () => { const before = s.rarity, r = mutateInnateOrigin(s); eco.changed?.(); audio.ok?.(); put(h("small", null, `MUTATION ROLL ${s.mutRoll}`), h("b", { class: "rt-big", style: `color:${col()};text-shadow:0 0 18px ${col()}` }, r === "up" ? "MUTATION!" : r === "down" ? "BACKLASH" : "THE SOUL RESISTS"), h("p", null, r === "up" ? `Your Origin rises to ${RARITY[s.rarity].name}.` : r === "down" ? `Your Origin falls from ${RARITY[before].name} to ${RARITY[s.rarity].name}.` : `It stays ${RARITY[s.rarity].name}.`), btn("REGISTER", step4)); };
      const step4 = () => { { const f = [...cat.itemById.values()].find((x) => x.category === "food"); if (f && !c.rations) { c.rations = 1; if (eco.addItem(f.item_id, 4).ok) api.toast(`The Hall gives you 4× ${f.name} for the road.`); } } eco.changed?.(); put(h("small", null, "OFFICIAL RECORD CREATED"), h("b", { class: "rt-big" }, s.name), h("p", null, `${RARITY[s.rarity].name} · quality ${s.quality} (${gradeOf(s.quality)}) — saved to your character. A Proof Token has been issued. Guanghuan Slot 1 is now open and empty — hunt an Origin Beast, absorb its Origin, and Guanghuan Initiate (Level 2) opens.`), btn("CLOSE", done)); };
      step0();
    });
  }

  // ------------------------------------------------------------------ Academy: quest-linked Skill Book items (never a cultivation path)
  api.talkAcademy = async (n) => {
    const npc = { model: n.model, view: "SW" }, say = (t, ch) => api.say([{ who: "npc", npc, name: n.name, text: t, choices: ch }]), c = C(), done = (c.academy ||= {});
    const list = SQS.filter((q) => !done[q.id] && q.need.every(([nm]) => cat.byName(nm)));
    if (!list.length) { await say("The Academy has no more errands for you today. Skill Books also drop from monsters — and from the right quests."); return; }
    const r = await say("This is the Academy. We keep books, not slots — no realm is crossed here. But a helpful hand earns a Skill Book for the path you walk.", [...list.map((q) => `${q.name} — ${q.need.map(([nm, k]) => `${k}× ${nm}`).join(", ")}`), "Another time"]);
    if (r == null || r >= list.length) return; const q = list[r], miss = q.need.filter(([nm, k]) => eco.total(cat.byName(nm).item_id) + 1e-9 < k);
    if (miss.length) { await say(`${q.blurb} Bring me ${q.need.map(([nm, k]) => `${k}× ${nm}`).join(" and ")}.`); return; }
    const a = activeClass(eco); if (!a) { await say("Our books bind only to a disciple already on a path. Return once a Class Change master has taken you in."); return; }
    const tgt = skillsOfClass(a.id).filter((s) => !s.ult && !isUnlocked(eco, s.id)).sort((x, y) => x.lv - y.lv)[0] || skillsOfClass(a.id).filter((s) => !s.ult)[0]; if (!tgt) return;
    for (const [nm, k] of q.need) eco._takeTotal(cat.byName(nm).item_id, k); done[q.id] = 1; addBooks(eco, tgt.id, q.books); eco.changed?.(); audio.ok?.();
    await say(`Well done. Take ${q.books}× Skill Book: ${tgt.name}. Use it in your Class Skill Tree when you are ready.`); api.toast(`+${q.books} Skill Book: ${tgt.name}`);
  };

  // ------------------------------------------------------------------ developer helpers
  api.devCult = {
    awaken: () => { const c = C(); if (c.innate) return api.toast("Already awakened."); awaken(eco, null, rollInnateOrigin()); addExp(eco, 0); api.toast("Dev: awakened"); },
    cap: () => { const hr = getHero(eco), c = C(), r = realmOf(hr.lv); if (hr.lv <= 1) { if (!c.innate) awaken(eco, null, rollInnateOrigin()); return api.toast("Dev: awakened — Guanghuan Slot 1 is open"); } const boss = ROSTER.find((m) => m.tier === "boss"); for (let i = 0; i < r.n; i++) if (!c.slots[i]) c.slots[i] = rollBeastOrigin(eco, boss, null, null, i + 1); if (passedOf(eco) < r.n) hr.lv = r.hi; hr.exp = 0; eco.changed?.(); api.toast(`Dev: Lv ${hr.lv} (realm cap)`); },
    origin: () => { const c = C(); if (c.pending || c.absorb) return api.toast("Already holding an Origin."); const slot = targetSlot(eco); if (!slot) return api.toast("Dev: no slot is open (use Awaken / Realm cap first)"); c.pending = rollBeastOrigin(eco, ROSTER.find((m) => m.tier === "boss"), null, null, slot); eco.changed?.(); api.toast(`Dev: Origin for slot ${slot}`); },
    food: () => { const f = cat.items?.find?.((x) => x.category === "food") || [...cat.itemById.values()].find((x) => x.category === "food"); if (f) { eco.addItem(f.item_id, 12); api.toast(`Dev: +12 ${f.name}`); } },
    skip: () => { const r = eco.devSkipTime(absorbMin(eco)); api.toast(r.ok ? "Dev: skipped the absorption time" : "Dev only"); },
  };
}
