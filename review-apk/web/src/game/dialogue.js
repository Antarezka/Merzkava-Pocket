// Dialogue box: EVERY conversation / narration in the game goes through here.
// Layout (portrait): the box sits in the bottom band (it replaces the dock, skill cluster and status pill while open);
// the PLAYER bust stands above the box on the left, the NPC bust above the box on the right; a line with no speaker (quests, system, narration) shows no bust.
//   say([ "narration", { who: "player", text }, { who: "npc", npc: { model: "hooded" }, name: "Trader Lan", text, choices: ["Buy", "Leave"] } ]) -> Promise<choiceIndex | null>
// A line: string | { text, who: "player" | "npc" | null, name?, npc?: { model, colors?, face?, view? }, choices?: [label | { label, lines? }] }.
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
    for (const [k, host] of [["l", bl], ["r", br]]) { host.replaceChildren(); if (busts[k]) host.append(busts[k].cloneNode ? cloneCanvas(busts[k]) : busts[k]); host.classList.toggle("on", !!busts[k]); host.classList.toggle("dim", !!busts[k] && ((k === "l") !== left && who !== null) ); }
    const name = line.name || (left ? getEngine()?.eco?.state?.profile?.name : right ? "" : ""); tag.textContent = name || ""; tag.className = "dg-tag" + (right ? " r" : "") + (name ? "" : " gm-hidden"); box.classList.toggle("narr", who === null);
    choices.replaceChildren(); next.classList.add("gm-hidden"); const full = line.text || ""; txt.textContent = ""; let i = 0; clearInterval(typing);
    return new Promise((done) => {
      const finish = () => { clearInterval(typing); typing = null; txt.textContent = full; if (line.choices?.length) { for (const [ci, c] of line.choices.entries()) { const b = typeof c === "string" ? { label: c } : c; choices.append(h("button", { type: "button", class: "dg-choice", onclick: (ev) => { ev.stopPropagation(); audio.tap?.(); done({ choice: ci, lines: b.lines }); } }, b.label)); } } else next.classList.remove("gm-hidden"); };
      cur.advance = () => { if (typing) { finish(); return; } if (!line.choices?.length) done({}); };
      typing = setInterval(() => { i += 1 + (full.length > 90 ? 1 : 0); txt.textContent = full.slice(0, i); if (i % 3 === 0) audio.tick?.(); if (i >= full.length) finish(); }, 28);
    });
  }
  function cloneCanvas(c) { const n = document.createElement("canvas"); n.width = c.width; n.height = c.height; n.getContext("2d").drawImage(c, 0, 0); return n; }
  async function run(job) {
    const e = getEngine(); cur = { advance: null, skipped: false, hadPlayer: false }; el.classList.remove("gm-hidden"); void el.offsetWidth; el.classList.add("on"); hud.classList.add("talking");
    if (e) { e.lock = (e.lock || 0) + 1; e.cancelAction?.(); e.player.path = []; e.player.moving = false; }
    let result = null; const lines = [...job.lines]; busts = { l: null, r: null };
    if (lines.some((l) => norm(l).who === "player")) cur.hadPlayer = true;
    while (lines.length && !cur.skipped) { const r = await show(lines.shift()); if (r.choice != null) { result = r.choice; if (r.lines) lines.unshift(...r.lines); } }
    clearInterval(typing); typing = null; el.classList.remove("on"); await new Promise((r) => setTimeout(r, 160)); el.classList.add("gm-hidden"); hud.classList.remove("talking"); bl.replaceChildren(); br.replaceChildren();
    if (e) e.lock = Math.max(0, (e.lock || 1) - 1); cur = null; job.done(result);
  }
  async function pump() { if (cur || !q.length) return; await run(q.shift()); pump(); }
  el.addEventListener("pointerdown", (ev) => { if (ev.target.closest(".dg-choice") || ev.target.closest(".dg-skip")) return; ev.stopPropagation(); cur?.advance?.(); });
  skip.addEventListener("click", (ev) => { ev.stopPropagation(); audio.tap?.(); if (cur) { cur.skipped = true; cur.advance?.(); clearInterval(typing); } });
  return {
    say(lines, opts = {}) { return new Promise((done) => { q.push({ lines: Array.isArray(lines) ? lines : [lines], done, opts }); pump(); }); },
    isOpen: () => !!cur || q.length > 0,
  };
}
