// Game-only music: main-menu theme, in-game day theme and the rhythm-event songs (Aura Repulsion).
// It is deliberately SEPARATE from the app's own sound engine (CRIWARE) and the app BGM: plain <audio> elements owned by this module only.
// They are created when the Game opens and destroyed (silent) the moment it closes - nothing here ever touches the app's audio.
// Optional: a `merzkava:game-audio` CustomEvent ({detail:{active}}) fires on window when game music starts / stops, in case the app wants to react.
export function createMusic({ base, getOpts }) {
  const asset = (f) => `${base}game-audio/${f}`, url = (n) => asset(n + ".mp3");
  const MAX = 0.9;                                   // headroom so the SFX layer is never buried
  let el = null, name = null, want = null, dead = false, fadeT = 0, duck = 1, floor = 0, gate = null, active = false, ramp = 0;
  const vol = () => Math.max(floor, Math.min(1, (getOpts().music ?? 55) / 100)) * MAX * duck;
  const announce = (on) => { if (active === on) return; active = on; try { window.dispatchEvent(new CustomEvent("merzkava:game-audio", { detail: { active: on } })); } catch {} };

  function tween(a, to, ms, done) {   // linear volume ramp on one element
    const from = a.volume, t0 = performance.now(); const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms)); try { a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch {}
      if (k >= 1) { clearInterval(id); done?.(); } }, 40); return id;
  }
  function retire(a, ms = 700) { if (!a) return; tween(a, 0, ms, () => { try { a.pause(); a.removeAttribute("src"); a.load(); } catch {} }); }
  function tryPlay(a) {
    const p = a.play?.(); if (!p?.catch) return; p.catch(() => { // autoplay blocked until the first touch: retry once on the next gesture
      if (gate || dead) return; gate = () => { document.removeEventListener("pointerdown", gate, true); document.removeEventListener("keydown", gate, true); gate = null; if (!dead && el === a && want) a.play?.().catch(() => {}); };
      document.addEventListener("pointerdown", gate, true); document.addEventListener("keydown", gate, true); });
  }
  const onVis = () => { if (!el) return; if (document.hidden) el.pause(); else if (want && !dead) tryPlay(el); };
  document.addEventListener("visibilitychange", onVis);

  return {
    /** start a track (cross-fades from the current one).  opts: { loop = true, from = 0 (seconds), fade = 0.9 (s), floor = 0..1 minimum volume even if Music is set to 0 } */
    play(n, o = {}) {
      if (dead) return null; const loop = o.loop !== false; floor = o.floor || 0;
      if (name === n && el && loop && !el.ended && !o.restart) { this.refresh(); return el; }
      const old = el; clearInterval(fadeT); retire(old, (o.fade ?? 0.9) * 1000);
      if (!vol()) { el = null; name = n; want = n; return null; }      // Music is off: remember what should play, stay silent
      const a = new Audio(); a.preload = "auto"; a.loop = loop; a.src = url(n); a.volume = 0; try { a.currentTime = o.from || 0; } catch {}
      if (o.from) a.addEventListener("loadedmetadata", () => { try { a.currentTime = o.from; } catch {} }, { once: true });
      el = a; name = n; want = n; announce(true); tryPlay(a); clearInterval(ramp); ramp = tween(a, vol(), (o.fade ?? 0.9) * 1000); return a;
    },
    stop(fade = 0.8) { want = null; name = null; clearInterval(ramp); const a = el; el = null; retire(a, fade * 1000); },
    /** call after Music volume / mute changes */
    refresh() { if (dead) return; if (!el && want && vol() > 0) { const n = want; want = null; this.play(n); return; } if (el) { if (vol() <= 0) { retire(el, 300); el = null; } else { clearInterval(ramp); try { el.volume = Math.min(1, vol()); } catch {} } } },
    /** scale the volume (night = 0.65, an overlay = 0.4 ...) */
    mood(k) { duck = k; if (el) { clearInterval(ramp); ramp = tween(el, Math.min(1, vol()), 600); } },
    asset, get el() { return el; }, get name() { return name; }, get playing() { return !!el && !el.paused; },
    destroy() { dead = true; want = null; clearInterval(ramp); document.removeEventListener("visibilitychange", onVis); if (gate) { document.removeEventListener("pointerdown", gate, true); document.removeEventListener("keydown", gate, true); gate = null; } const a = el; el = null; if (a) { try { a.pause(); a.removeAttribute("src"); a.load(); } catch {} } announce(false); },
  };
}
