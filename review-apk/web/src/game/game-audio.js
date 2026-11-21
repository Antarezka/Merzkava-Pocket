// Game audio — every sound of the RPG (BGM, beatmap songs, effects) goes through the app's one CRIWARE ADX engine (PocketNative.criGame*).
// The WebView never plays sound itself. When the native bridge is absent (plain browser preview / old APK) everything is a silent no-op.
// Game audio is exclusive to game mode: entering announces `merzkava:game-audio {active:true}` (the app's menu / vinyl BGM yields), leaving announces active:false.
const nb = () => (typeof window !== "undefined" ? window.PocketNative : null) || null;
const call = (name, ...args) => { try { const n = nb(), f = n && n[name]; return typeof f === "function" ? f.apply(n, args) : undefined; } catch { return undefined; } };
const announce = (on) => { try { window.dispatchEvent(new CustomEvent("merzkava:game-audio", { detail: { active: on } })); } catch {} };
export const gameAudioNative = () => typeof nb()?.criGamePlay === "function";

/** Effects: tap / ok / no / tick / thud / coin — short pre-rendered ADX cues played on the game SFX channels. */
export function createAudio(getOpts) {
  const vol = () => Math.max(0, Math.min(1, (getOpts().sfx ?? 80) / 100));
  const cue = (name) => () => { const v = vol(); if (v > 0) call("criGameSfx", name, v); };
  return { tap: cue("tap"), ok: cue("ok"), no: cue("no"), tick: cue("tick"), thud: cue("thud"), coin: cue("coin"), music() {}, refresh() {}, destroy() {} };
}

/** BGM: menu, day and the five rhythm-event songs. play() returns a clock handle so the rhythm event can read the song position straight from the engine. */
export function createMusic({ base, getOpts }) {
  const asset = (f) => `${base}game-data/${f}`;          // beat charts (JSON) only — audio itself lives in the native ADX bank
  const MAX = 0.9;                                          // headroom so effects are never buried
  let name = null, want = null, dead = false, duck = 1, floor = 0, from = 0, t0 = 0, playing = false, hidden = false;
  const vol = () => Math.max(floor, Math.min(1, (getOpts().music ?? 55) / 100)) * MAX * duck;
  const handle = { get paused() { return !playing || hidden; }, get readyState() { return playing ? 4 : 0; },
    get currentTime() { const ms = call("criGameTimeMs"); return typeof ms === "number" && ms >= 0 ? ms / 1000 : from + (performance.now() - t0) / 1000; } };
  const onMode = (e) => { const bubble = e.detail?.mode === "bubble"; if (bubble === hidden) return; hidden = bubble; call("criGamePause", hidden); };
  window.addEventListener("pocket:render-mode", onMode); announce(true); call("criGameEnter");
  return {
    asset,
    play(n, o = {}) {
      if (dead) return null; const loop = o.loop !== false; floor = o.floor || 0;
      if (name === n && loop && playing && !o.restart) { this.refresh(); return handle; }
      name = n; want = n; from = o.from || 0; t0 = performance.now();
      if (!vol()) { playing = false; call("criGameStop", Math.round((o.fade ?? 0.9) * 1000)); return null; }     // Music is off: remember what should play, stay silent
      playing = true; call("criGamePlay", n, loop, Math.round(from * 1000), Math.round((o.fade ?? 0.9) * 1000), vol()); return handle;
    },
    stop(fade = 0.8) { playing = false; want = null; name = null; call("criGameStop", Math.round(fade * 1000)); },
    refresh() { if (dead) return; if (!playing && want && vol() > 0) { const n = want; want = null; this.play(n); return; } if (playing) { if (vol() <= 0) { playing = false; want = name; call("criGameStop", 300); } else call("criGameVolume", vol(), 160); } },
    mood(k) { duck = k; if (playing) call("criGameVolume", vol(), 900); },
    destroy() { if (dead) return; dead = true; playing = false; window.removeEventListener("pocket:render-mode", onMode); call("criGameStop", 400); call("criGameExit"); announce(false); },
  };
}
