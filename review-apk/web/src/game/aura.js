// Aura Repulsion: the interruption mini-game played while a Spirit Ring is being absorbed (spec v4 section 17, kept in v9).
// It is a rhythm game: the bubbles follow the beat-maps generated from the five rhythm songs (public/game-audio/beats.json - 5 songs x 9 charts, one chart per Spirit Realm,
// easy -> hard).  A random song is chosen each time; the higher the realm, the longer the excerpt (45 s ... the whole song), the denser the chart, the faster the approach
// rings, the tighter the timing windows and the higher the accuracy needed to repel the intruders.
// Judgments: Perfect / Great / Good / Bad / Miss.  The absorption clock never pauses while this plays (the overlay lives on top of the world; nothing here touches the clock).
const JUDGE = [["PERFECT", 1, "#ffe27a"], ["GREAT", 0.7, "#8ff0b8"], ["GOOD", 0.4, "#8fc8ff"], ["BAD", 0.15, "#c9a0ff"], ["MISS", 0, "#ff7a6a"]];
const EXCERPT = [45, 60, 75, 90, 105, 120, 140, 160, 999];            // seconds of music per realm (the last one is the whole song)
const LEVEL_NAME = ["EASY", "EASY", "NORMAL", "NORMAL", "HARD", "HARD", "EXPERT", "EXPERT", "MASTER"];

/** difficulty curve by Spirit Realm 1..9 (the chart density itself comes from the beat-map; this is everything around it) */
export function auraParams(realm) {
  const r = Math.max(1, Math.min(9, realm)), scale = Math.max(0.72, 1 - 0.035 * (r - 1) - (r >= 8 ? 0.04 : 0));
  return { ar: [1.35, 1.25, 1.15, 1.05, 0.95, 0.85, 0.76, 0.68, 0.6][r - 1], win: [55, 110, 170, 240].map((v) => v * scale / 1000), pass: Math.min(0.95, 0.55 + 0.035 * (r - 1) + (r >= 8 ? 0.03 : 0)),
    size: Math.max(46, 66 - r * 2), len: EXCERPT[r - 1], level: LEVEL_NAME[r - 1], chart: r };
}

let BEATS = null, last = null;
async function loadBeats(music) { if (BEATS) return BEATS; try { const r = await fetch(music.asset("beats.json")); BEATS = await r.json(); } catch { BEATS = null; } return BEATS; }

/** the notes of one event: [{ t (seconds on the event timeline) }], plus where in the song to start */
export function planEvent(song, realm, lead, rnd = Math.random) {
  const P = auraParams(realm), chart = song.charts[String(P.chart)] || song.charts["1"], dur = song.dur, minStart = lead + 0.5, full = P.len >= dur - minStart - 3;
  let start = minStart;
  if (!full) {
    const cands = []; song.beats.forEach((ms, k) => { const t = ms / 1000; if ((k - (song.bar0 || 0)) % 8 === 0 && t >= minStart && t + P.len <= dur - 2.5) cands.push([t, chart.filter((c) => c / 1000 >= t && c / 1000 < t + P.len).length]); });
    cands.sort((a, b) => b[1] - a[1]); const pool = cands.slice(0, Math.max(1, Math.ceil(cands.length * 0.4))); if (pool.length) start = pool[Math.floor(rnd() * pool.length)][0];
  }
  const end = full ? dur : start + P.len, notes = chart.filter((c) => c / 1000 >= start && c / 1000 < end).map((c) => c / 1000 - start + lead);
  return { P, notes, start, from: Math.max(0, start - lead), beats: song.beats.map((b) => b / 1000 - start + lead).filter((b) => b >= 0) };   // song position - from = event time (the music starts `lead` s before the first allowed note)
}

export function createAura({ h, root, audio, music, getOpts }) {
  let live = null;
  const isOpen = () => !!live;
  async function play({ realm = 1, foe = "bandits", lead = 2.4 } = {}) {
    if (live) return live.promise;
    let resolveAll; const promise = new Promise((r) => { resolveAll = r; }); live = { promise };
    const data = music ? await loadBeats(music) : null, songs = data?.songs || [];
    let song = null; if (songs.length) { const pool = songs.filter((s) => s.id !== last); song = pool[Math.floor(Math.random() * pool.length)] || songs[0]; last = song.id; }
    const P = auraParams(realm); let plan;
    if (song) plan = planEvent(song, realm, lead); else { const gap = Math.max(0.4, 1.1 - 0.07 * realm), n = 14 + 3 * realm; plan = { P, notes: Array.from({ length: n }, (_, i) => lead + i * gap), from: 0, beats: [] }; }   // no beat-map available: plain metronome fallback
    const { notes, beats } = plan, bar = h("i"), pct = h("em", null, "0%"), combo = h("b", null, "0"), acc = h("b", null, "100%"), say = h("div", { class: "au-say" }), field = h("div", { class: "au-field" });
    const el = h("div", { class: "au" }, h("div", { class: "au-top" }, h("div", { class: "au-t1" }, h("b", null, "AURA REPULSION"), h("small", null, song ? `♪ ${song.title} · ${Math.round(song.bpm)} BPM · ${P.level}` : "INTERRUPTION EVENT")), h("div", { class: "au-bar" }, bar), h("div", { class: "au-t2" }, h("small", null, "EVENT TIME"), pct)),
      h("div", { class: "au-intro" }, `${foe === "beasts" ? "Spirit Beasts" : "Bandits"} are closing in on your meditation!`, h("small", null, "Tap each bubble when its ring closes on it")), field, say,
      h("div", { class: "au-bot" }, h("div", null, h("small", null, "COMBO"), combo), h("div", null, h("small", null, `ACCURACY · NEED ${Math.round(P.pass * 100)}%`), acc), h("button", { class: "au-skip", type: "button" }, "LET THEM")));
    root.append(el); await new Promise((r) => requestAnimationFrame(r));
    const fb = field.getBoundingClientRect(), FW = fb.width || 360, FH = fb.height || 540, mg = P.size / 2 + 8, seq = []; let prev = [];
    for (let i = 0; i < notes.length; i++) {   // positions: a flowing walk - the faster the notes, the shorter the jump (so dense charts stay playable)
      const t = notes[i], gap = i ? t - notes[i - 1] : 1, R = Math.max(70, Math.min(300, 70 + 380 * gap)); let x, y, tries = 0;
      do { if (prev.length && tries < 20) { const a = Math.random() * 6.283, d = R * (0.6 + Math.random() * 0.4); x = prev[prev.length - 1][0] + Math.cos(a) * d; y = prev[prev.length - 1][1] + Math.sin(a) * d * 1.25; } else { x = mg + Math.random() * (FW - 2 * mg); y = mg + Math.random() * (FH - 2 * mg); } tries++;
      } while (tries < 40 && (x < mg || x > FW - mg || y < mg || y > FH - mg || prev.slice(-3).some(([px, py]) => Math.hypot(px - x, py - y) < P.size * 1.25))); x = Math.max(mg, Math.min(FW - mg, x)); y = Math.max(mg, Math.min(FH - mg, y)); prev.push([x, y]);
      const n = h("div", { class: "au-b", style: `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:${P.size}px;height:${P.size}px;--ar:${P.ar}s` }, h("span", null, String((i % 4) + 1).padStart(2, "0")), h("i", { class: "au-ap" }));
      const s = { t, el: n, done: false, shown: false }; n.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); judge(s, clock()); }); seq.push(s);
    }
    // ---- clock: the song is the clock when it plays; otherwise the system timer
    const a = song && music ? music.play(song.id, { loop: false, from: plan.from, fade: 0.5, floor: 0.35, restart: true }) : null, t0w = performance.now(); let t0 = t0w, synced = false;
    if (a) await new Promise((r) => { let done = false; const go = () => { if (!done) { done = true; r(); } }; a.addEventListener("playing", go, { once: true }); setTimeout(go, 1500); });
    const songPos = () => (a && !a.paused && a.readyState >= 2 ? a.currentTime - plan.from : null);
    t0 = performance.now() - (songPos() ?? 0) * 1000; if (songPos() == null) t0 = performance.now();
    const off = () => (getOpts?.().beatOffset || 0) / 1000;
    function clock() { const sp = songPos(), now = (performance.now() - t0) / 1000; if (sp != null) { const d = now - sp; if (Math.abs(d) > 0.25) t0 += d * 1000; else if (Math.abs(d) > 0.02) t0 += d * 1000 * 0.08; } return (performance.now() - t0) / 1000 - off(); }
    const total = (notes[notes.length - 1] || lead) + P.win[3] + 0.9, counts = [0, 0, 0, 0, 0]; let n = 0, sum = 0, cb = 0, raf = 0, finished = false, bi = 0;
    function pop(s, j) { const [name, , col] = JUDGE[j]; const t = h("div", { class: "au-j", style: `left:${s.el.style.left};top:${s.el.style.top};color:${col}` }, name); field.append(t); setTimeout(() => t.remove(), 600); s.el.classList.add(j < 4 ? "hit" : "miss"); setTimeout(() => s.el.remove(), 260); }
    function judge(s, now) {
      if (s.done || finished) return; const d = Math.abs(now - s.t); if (now < s.t - P.win[3]) { s.el.classList.add("early"); setTimeout(() => s.el.classList.remove("early"), 200); return; }
      const j = d <= P.win[0] ? 0 : d <= P.win[1] ? 1 : d <= P.win[2] ? 2 : d <= P.win[3] ? 3 : 4; settle(s, j); audio?.tap?.();
    }
    function settle(s, j) { s.done = true; n++; counts[j]++; sum += JUDGE[j][1]; cb = j < 3 ? cb + 1 : 0; pop(s, j); combo.textContent = cb; acc.textContent = Math.round((sum / n) * 100) + "%"; }
    function finish(ignored) {
      if (finished) return; finished = true; cancelAnimationFrame(raf); const acc0 = notes.length ? sum / notes.length : 0, ok = !ignored && acc0 >= P.pass;
      say.textContent = ok ? "INTRUDERS REPELLED" : "THE INTRUDERS BREAK THROUGH"; say.className = "au-say show " + (ok ? "ok" : "bad"); live = null; if (music && song) music.play("day", { fade: 1.4 });
      setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); resolveAll({ passed: ok, acc: acc0, counts, ignored: !!ignored, song: song?.id }); }, 1100);
    }
    el.querySelector(".au-skip").addEventListener("click", () => { for (const s of seq) if (!s.done) s.el.remove(); finish(true); });
    function loop() {
      if (finished) return; if (!el.isConnected) { finished = true; live = null; resolveAll({ passed: false, acc: 0, counts, ignored: true }); return; }
      const now = clock();
      for (const s of seq) { if (s.done) continue; if (!s.shown && now >= s.t - P.ar) { s.shown = true; field.append(s.el); } if (now > s.t + P.win[3]) settle(s, 4); }
      while (bi < beats.length && beats[bi] <= now) { if (beats[bi] > now - 0.12) { field.classList.remove("bt"); void field.offsetWidth; field.classList.add("bt"); } bi++; }
      bar.style.width = Math.min(100, Math.max(0, now / total * 100)).toFixed(1) + "%"; pct.textContent = Math.min(100, Math.max(0, Math.round(now / total * 100))) + "% ELAPSED"; el.classList.toggle("go", now > lead - 0.2);
      if (seq.every((s) => s.done) || now > total) { for (const s of seq) if (!s.done) settle(s, 4); finish(); return; } raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop); live.el = el; return promise;
  }
  return { play, isOpen };
}
