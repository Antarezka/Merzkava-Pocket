// Dialogue box: EVERY conversation / narration in the game goes through here.
// Layout (portrait): the box sits in the bottom band (it replaces the dock, skill cluster and status pill while open);
// the PLAYER bust stands above the box on the left, the NPC bust above the box on the right; a line with no speaker (quests, system, narration) shows no bust.
//   say([ "narration", { who: "player", text }, { who: "npc", npc: { model: "hooded" }, name: "Trader Lan", text, choices: ["Buy", "Leave"] } ]) -> Promise<choiceIndex | null>
// A line: string | { text, who: "player" | "npc" | null, name?, npc?: { model, colors?, face?, view? }, choices?: [label | { label, sub?, lines? }] }.
// Choices sit in a column on the RIGHT of the box (text on the left); the box keeps the game's own look. Touching an option only MOVES the pointer to it; touching the option the pointer is already on
// (or Enter / Space) confirms. 1-9 / arrow keys move the pointer (desktop preview). Nothing is ever chosen by a single stray touch.
export function createDialogue({ h, root, hud, audio, getEngine }) {
  const q = []; let cur = null, typing = null, busts = { l: null, r: null };
  const bl = h("div", { class: "dg-bust l" }), br = h("div", { class: "dg-bust r" });
  const tag = h("div", { class: "dg-tag" }), txt = h("p", { class: "dg-text" }), choices = h("div", { class: "dg-choices" }), next = h("i", { class: "dg-next" }, "▼"), skip = h("button", { type: "button", class: "dg-skip" }, "SKIP ▸▸");
  const box = h("div", { class: "dg-box" }, tag, skip, txt, choices, next), el = h("div", { class: "dg gm-hidden" }, bl, br, box); root.append(el);
  const cache = new Map();
  async function bust(spec, view) {
    const e = getEngine(), kit = e?.kit; if (!kit || !spec?.model) return null; const key = JSON.stringify([spec, view]);
    if (!cache.has(key)) { try { await kit.load(spec.model); } catch { return null; } const m = kit.models[spec.model], vn = m.views[view] ? view : "S"; cache.set(key, kit.renderBust(spec, vn, 560)); } return cache.get(key);
  }
  const norm = (l) => (typeof l === "string" ? { text: l } : l);
  async function show(line) {
    line = norm(line); const who = line.who || null, e = getEngine(), left = who === "player", right = who === "npc";
    // busts: the player's on the left stays visible (dimmed) when an NPC speaks, and vice versa; a speaker-less line hides both
    if (who === null) { busts.l = busts.r = null; }
    else { if (who === "player" || busts.l === null) { const spec = e?.appSpec; if (spec && (who === "player" || cur?.hadPlayer)) busts.l = await bust(spec, "SE"); }
      if (who === "player" && !busts.l) busts.l = await bust(e?.appSpec, "SE");
      if (right && line.npc) busts.r = await bust(line.npc, line.npc.view || "SW"); }
    for (const [k, host] of [["l", bl], ["r", br]]) { host.replaceChildren(); if (busts[k]) host.append(cloneCanvas(busts[k])); host.classList.toggle("on", !!busts[k]); host.classList.toggle("dim", !!busts[k] && ((k === "l") !== left && who !== null)); host.classList.remove("talk"); }
    const speaker = who === "player" ? bl : who === "npc" ? br : null;   // the bust of whoever is speaking trembles while the line types out; the other one is dimmed
    const name = line.name || (left ? getEngine()?.eco?.state?.profile?.name : right ? "" : ""); tag.textContent = name || ""; tag.className = "dg-tag" + (right ? " r" : "") + (name ? "" : " gm-hidden"); box.classList.toggle("narr", who === null);
    choices.replaceChildren(); choices.classList.remove("pend"); box.classList.remove("has-choices"); if (cur) cur.choiceKeys = null; next.classList.add("gm-hidden"); const full = line.text || ""; txt.textContent = ""; let i = 0; clearInterval(typing);
    return new Promise((done) => {
      // the option column is laid out (hidden) from the first frame so the box never changes height when the text finishes and the busts do not jump
      let activate = null;
      if (line.choices?.length) {
        const opts = line.choices.map((c) => (typeof c === "string" ? { label: c } : c)); let sel = 0; box.classList.add("has-choices"); choices.classList.add("pend");
        const rows = opts.map((b, ci) => h("button", { type: "button", class: "dg-choice", role: "option" }, h("i", { class: "dg-ptr", "aria-hidden": "true" }, "▸"), h("span", { class: "dg-lb" }, b.label, b.sub ? h("small", {}, b.sub) : null)));
        const paint = () => rows.forEach((r, ci) => { r.classList.toggle("sel", ci === sel); r.setAttribute("aria-selected", ci === sel ? "true" : "false"); });
        const move = (to) => { to = Math.max(0, Math.min(opts.length - 1, to)); if (to !== sel) { sel = to; paint(); audio.tick?.(); } };
        const confirm = () => { audio.tap?.(); cur.choiceKeys = null; done({ choice: sel, lines: opts[sel].lines }); };
        rows.forEach((r, ci) => r.addEventListener("click", (ev) => { ev.stopPropagation(); if (ci !== sel) move(ci); else confirm(); }));   // 1st touch: pointer moves; touching the pointed option: confirm
        choices.append(...rows); paint();
        activate = () => { choices.classList.remove("pend"); cur.choiceKeys = (k) => { if (k === "ArrowDown" || k === "ArrowRight") move(sel + 1); else if (k === "ArrowUp" || k === "ArrowLeft") move(sel - 1); else if (k === "Enter" || k === " ") confirm(); else if (/^[1-9]$/.test(k)) move(+k - 1); else return false; return true; }; };
      }
      const finish = () => {
        clearInterval(typing); typing = null; txt.textContent = full; speaker?.classList.remove("talk");
        if (activate) activate(); else next.classList.remove("gm-hidden");
      };
      cur.advance = () => { if (typing) { finish(); return; } if (!line.choices?.length) done({}); };
      syncH(); if (busts[who === "player" ? "l" : "r"]) speaker?.classList.add("talk"); typing = setInterval(() => { i += 1 + (full.length > 90 ? 1 : 0); txt.textContent = full.slice(0, i); if (i % 3 === 0) audio.tick?.(); if (i >= full.length) finish(); }, 28);
    });
  }
  // the busts stand on the top edge of the box, whatever height the box has (taller when the option column is open)
  function syncH() { el.style.setProperty("--dg-h", box.offsetHeight + "px"); }
  function cloneCanvas(c) { const n = document.createElement("canvas"); n.width = c.width; n.height = c.height; n.getContext("2d").drawImage(c, 0, 0); return n; }
  async function run(job) {
    const e = getEngine(); cur = { advance: null, skipped: false, hadPlayer: false }; el.classList.remove("gm-hidden"); void el.offsetWidth; el.classList.add("on"); hud.classList.add("talking");
    if (e) { e.lock = (e.lock || 0) + 1; e.cancelAction?.(); e.player.path = []; e.player.moving = false; }
    let result = null; const lines = [...job.lines]; busts = { l: null, r: null };
    if (lines.some((l) => norm(l).who === "player")) cur.hadPlayer = true;
    while (lines.length && !cur.skipped) { const r = await show(lines.shift()); if (r.choice != null) { result = r.choice; if (r.lines) lines.unshift(...r.lines); } }
    clearInterval(typing); typing = null; bl.classList.remove("talk"); br.classList.remove("talk"); el.classList.remove("on"); await new Promise((r) => setTimeout(r, 160)); el.classList.add("gm-hidden"); hud.classList.remove("talking"); bl.replaceChildren(); br.replaceChildren();
    if (e) e.lock = Math.max(0, (e.lock || 1) - 1); cur = null; job.done(result);
  }
  async function pump() { if (cur || !q.length) return; await run(q.shift()); pump(); }
  const onKey = (ev) => { if (cur?.choiceKeys && cur.choiceKeys(ev.key)) ev.preventDefault(); }; window.addEventListener("keydown", onKey);
  el.addEventListener("pointerdown", (ev) => { if (ev.target.closest(".dg-choice") || ev.target.closest(".dg-skip")) return; ev.stopPropagation(); cur?.advance?.(); });
  skip.addEventListener("click", (ev) => { ev.stopPropagation(); audio.tap?.(); if (cur) { cur.skipped = true; cur.advance?.(); clearInterval(typing); } });
  return {
    say(lines, opts = {}) { return new Promise((done) => { q.push({ lines: Array.isArray(lines) ? lines : [lines], done, opts }); pump(); }); },
    isOpen: () => !!cur || q.length > 0,
    dispose() { window.removeEventListener("keydown", onKey); clearInterval(typing); },
  };
}
