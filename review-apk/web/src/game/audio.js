// Tiny WebAudio layer (no audio files): UI ticks / gather thuds + a soft pentatonic pad. Volumes come from the Options screen.
export function createAudio(getOpts) {
  let ctx = null, master = null, musicGain = null, timer = null, playing = false;
  const ensure = () => { if (ctx) return ctx; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); musicGain = ctx.createGain(); musicGain.connect(master); return ctx; };
  const vol = (k) => Math.max(0, Math.min(1, (getOpts()[k] ?? 60) / 100));
  function blip(freq = 660, dur = 0.08, type = "sine", gain = 0.18, slide = 0) {
    const c = ensure(); if (!c || vol("sfx") <= 0) return; if (c.state === "suspended") c.resume();
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain * vol("sfx"), t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  function note(semi, t, len) {
    const f = 220 * Math.pow(2, semi / 12), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o2.type = "triangle"; o.frequency.value = f; o2.frequency.value = f * 2.003;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0005, t + len); o.connect(g); o2.connect(g); g.connect(musicGain); o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
  }
  return {
    tap: () => blip(720, 0.06, "triangle", 0.12), ok: () => { blip(660, 0.09, "sine", 0.16); setTimeout(() => blip(990, 0.12, "sine", 0.14), 70); }, no: () => blip(180, 0.16, "square", 0.08, -60),
    thud: () => blip(110, 0.12, "sine", 0.3, -50), coin: () => { blip(1320, 0.07, "square", 0.07); setTimeout(() => blip(1760, 0.12, "square", 0.07), 60); },
    music(on) {
      if (!on) { playing = false; clearInterval(timer); timer = null; if (musicGain && ctx) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4); return; }
      const c = ensure(); if (!c || playing) { this.refresh(); return; } playing = true; if (c.state === "suspended") c.resume(); this.refresh();
      let step = 0; const tick = () => { if (!playing || vol("music") <= 0) return; const t = c.currentTime + 0.05, root = [0, -3, -5, -2][Math.floor(step / 4) % 4]; if (step % 2 === 0) note(root + SCALE[(step * 3) % 5], t, 3.4); if (step % 4 === 2) note(root + 12 + SCALE[(step * 2 + 1) % 5], t, 2.4); step++; };
      tick(); timer = setInterval(tick, 1700);
    },
    refresh() { if (musicGain && ctx) musicGain.gain.setTargetAtTime(vol("music") * 0.9, ctx.currentTime, 0.3); },
    destroy() { playing = false; clearInterval(timer); try { ctx?.close(); } catch {} ctx = null; },
  };
}
