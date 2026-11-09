const TRACKS = Object.freeze({
  happy: { title: "Happy-1a", src: "/audio/Happy-1a.ogg" },
  chill: { title: "chill-1a", src: "/audio/chill-1a.ogg" }
});

const EFFECTS = Object.freeze({
  needle: "/audio/needle%20drop%2Bvinyls%20crackle.mp3",
  placement: "/audio/record%20placement.mp3"
});

const clampVolume = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export function createPocketAudioController({
  AudioCtor = globalThis.Audio,
  storage = globalThis.localStorage,
  onChange = () => {},
  onPlaybackCycle = () => {},
  customTracks = []
} = {}) {
  if (typeof AudioCtor !== "function") throw new Error("Audio playback is unavailable.");

  const read = (key, fallback) => {
    try {
      const value = storage?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch { return fallback; }
  };
  const write = (key, value) => {
    try { storage?.setItem(key, String(value)); } catch {}
  };

  let trackCatalog = { ...TRACKS };
  const normalizeCustomTracks = entries => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      const id = String(entry?.id ?? "");
      const title = String(entry?.title ?? "").trim();
      if (!/^[a-f0-9-]{36}$/i.test(id) || !title) continue;
      trackCatalog[id] = {
        title,
        src: "https://pocket.local/user-audio/" + id + ".ogg",
        custom: true
      };
    }
  };
  normalizeCustomTracks(customTracks);
  let selectedTrack = read("mp-audio-track", "happy");
  if (!Object.hasOwn(trackCatalog, selectedTrack)) selectedTrack = "happy";
  let musicVolume = clampVolume(read("mp-audio-music-volume", 68));
  let effectsVolume = clampVolume(read("mp-audio-effects-volume", 76));
  let menuEntered = false;
  let userPaused = false;
  let resumeAfterSplash = false;
  let needleStarting = false;
  let needleToken = 0;
  let activeNeedleEffect = null;
  let lastPlaybackTime = 0;
  let lastPlaybackDuration = 0;
  let lastCycleNotification = 0;

  const music = new AudioCtor(trackCatalog[selectedTrack].src);
  music.preload = "auto";
  music.loop = true;
  music.volume = musicVolume / 100;

  const notify = () => onChange(getState());
  const isPlaying = () => music.paused === false && music.ended !== true;
  const createEffect = name => {
    const src = EFFECTS[name];
    if (!src || effectsVolume <= 0) return null;
    const effect = new AudioCtor(src);
    effect.preload = "auto";
    effect.volume = effectsVolume / 100;
    return effect;
  };
  const playEffect = name => {
    const effect = createEffect(name);
    if (!effect) return null;
    try {
      const result = effect.play();
      result?.catch?.(() => {});
    } catch {}
    return effect;
  };
  const cancelNeedleStart = () => {
    needleToken += 1;
    needleStarting = false;
    const effect = activeNeedleEffect;
    activeNeedleEffect = null;
    if (effect) {
      try { effect.pause(); effect.currentTime = 0; } catch {}
    }
  };
  const startMusic = async () => {
    if (!menuEntered) return false;
    try {
      await music.play();
      notify();
      return true;
    } catch {
      notify();
      return false;
    }
  };
  const waitForEffect = effect => new Promise(resolve => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      effect.removeEventListener?.("ended", finish);
      effect.removeEventListener?.("error", finish);
      effect.removeEventListener?.("pause", finish);
      resolve();
    };
    const fallback = setTimeout(finish, 5000);
    effect.addEventListener?.("ended", finish, { once: true });
    effect.addEventListener?.("error", finish, { once: true });
    effect.addEventListener?.("pause", finish, { once: true });
    if (effect.ended) finish();
  });

  const reportPlaybackCycle = () => {
    const stamp = Date.now();
    if (stamp - lastCycleNotification < 900) return;
    lastCycleNotification = stamp;
    lastPlaybackTime = 0;
    lastPlaybackDuration = Number.isFinite(music.duration) ? music.duration : 0;
    try { onPlaybackCycle({ track: selectedTrack, title: trackCatalog[selectedTrack].title }); } catch {}
    notify();
  };

  music.addEventListener?.("play", () => {
    lastPlaybackTime = Number(music.currentTime) || 0;
    lastPlaybackDuration = Number.isFinite(music.duration) ? music.duration : 0;
    notify();
  });
  music.addEventListener?.("pause", notify);
  music.addEventListener?.("ended", reportPlaybackCycle);
  music.addEventListener?.("error", notify);
  // Looping HTMLAudioElements do not fire "ended". Detect the natural wrap at the end
  // of a complete song so the record label still changes at every playback cycle.
  music.addEventListener?.("timeupdate", () => {
    const current = Number(music.currentTime) || 0;
    const duration = Number(music.duration) || lastPlaybackDuration;
    if (Number.isFinite(duration) && duration > 1 && lastPlaybackTime > current + 0.25 &&
        lastPlaybackTime >= duration - 1.4 && current <= 1.4) {
      reportPlaybackCycle();
    }
    lastPlaybackTime = current;
    if (Number.isFinite(music.duration) && music.duration > 0) lastPlaybackDuration = music.duration;
  });

  function getState() {
    return {
      track: selectedTrack,
      title: trackCatalog[selectedTrack].title,
      musicVolume,
      effectsVolume,
      isPlaying: isPlaying(),
      isStarting: needleStarting,
      menuEntered
    };
  }

  function enterMainMenu() {
    if (!menuEntered) {
      menuEntered = true;
      resumeAfterSplash = false;
      if (!userPaused) void startMusic();
      return;
    }
    if (resumeAfterSplash && !userPaused) {
      resumeAfterSplash = false;
      void startMusic();
    }
  }

  function pauseForSplash() {
    resumeAfterSplash = isPlaying();
    cancelNeedleStart();
    music.pause();
    notify();
  }

  function resetSession() {
    cancelNeedleStart();
    music.pause();
    menuEntered = false;
    userPaused = false;
    resumeAfterSplash = false;
    notify();
  }

  function selectTrack(id) {
    if (!Object.hasOwn(trackCatalog, id) || id === selectedTrack) return false;
    cancelNeedleStart();
    music.pause();
    music.currentTime = 0;
    lastPlaybackTime = 0;
    lastPlaybackDuration = 0;
    selectedTrack = id;
    userPaused = true;
    music.src = trackCatalog[selectedTrack].src;
    music.loop = true;
    music.load?.();
    write("mp-audio-track", selectedTrack);
    notify();
    return true;
  }

  async function lowerNeedleAndPlay() {
    if (!menuEntered) return false;
    cancelNeedleStart();
    const token = needleToken;
    userPaused = false;
    needleStarting = true;
    notify();
    const effect = createEffect("needle");
    activeNeedleEffect = effect;
    if (effect) {
      try {
        await effect.play();
        await waitForEffect(effect);
      } catch {}
      finally {
        if (activeNeedleEffect === effect) activeNeedleEffect = null;
      }
    }
    if (token !== needleToken || userPaused) return false;
    needleStarting = false;
    return startMusic();
  }

  function toggleNeedle() {
    if (isPlaying() || needleStarting) {
      cancelNeedleStart();
      userPaused = true;
      music.pause();
      notify();
      return Promise.resolve(false);
    }
    return lowerNeedleAndPlay();
  }

  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    music.volume = musicVolume / 100;
    write("mp-audio-music-volume", musicVolume);
    notify();
  }

  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    write("mp-audio-effects-volume", effectsVolume);
    notify();
  }

  function updateCustomTracks(entries) {
    trackCatalog = { ...TRACKS };
    normalizeCustomTracks(entries);
    if (!Object.hasOwn(trackCatalog, selectedTrack)) {
      const resumeBuiltIn = menuEntered && isPlaying() && !userPaused;
      music.pause();
      selectedTrack = "happy";
      music.currentTime = 0;
      music.src = trackCatalog.happy.src;
      music.loop = true;
      music.load?.();
      write("mp-audio-track", selectedTrack);
      if (resumeBuiltIn) void startMusic();
    }
    notify();
    return getTracks();
  }

  function getTracks() {
    return Object.entries(trackCatalog).map(([id, track]) => ({
      id,
      title: track.title,
      custom: track.custom === true
    }));
  }

  return {
    getState,
    getTracks,
    updateCustomTracks,
    enterMainMenu,
    pauseForSplash,
    resetSession,
    selectTrack,
    toggleNeedle,
    playEffect,
    setMusicVolume,
    setEffectsVolume
  };
}

export function createTurntableMotion({
  onFrame = () => {},
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame
} = {}) {
  if (typeof requestFrame !== "function" || typeof cancelFrame !== "function") {
    throw new Error("Smooth turntable motion requires animation-frame support.");
  }
  let angle = 0;
  let speed = 0;
  let targetSpeed = 0;
  let lastTime = null;
  let frameId = null;
  let disposed = false;

  const tick = now => {
    frameId = null;
    if (disposed) return;
    if (lastTime === null) lastTime = now;
    const delta = Math.max(0, Math.min(0.05, (now - lastTime) / 1000));
    lastTime = now;
    const timeConstant = targetSpeed > speed ? 0.48 : 0.32;
    speed += (targetSpeed - speed) * (1 - Math.exp(-delta / timeConstant));
    angle = (angle + speed * delta) % 360;
    onFrame(angle, speed);

    if (targetSpeed === 0 && speed < 0.8) {
      speed = 0;
      lastTime = null;
      onFrame(angle, speed);
      return;
    }
    frameId = requestFrame(tick);
  };

  function setPlaying(playing) {
    if (disposed) return;
    targetSpeed = playing ? 200 : 0;
    if (frameId === null && (targetSpeed > 0 || speed > 0)) {
      lastTime = null;
      frameId = requestFrame(tick);
    }
  }

  function dispose() {
    disposed = true;
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
    speed = 0;
    targetSpeed = 0;
    lastTime = null;
  }

  return {
    setPlaying,
    dispose,
    getState: () => ({ angle, speed, targetSpeed, running: frameId !== null, disposed })
  };
}


export const VINYL_STYLES = Object.freeze([
  { id:"r01", number:"01", name:"Non-standard Geometry", micro:"MERZKAVA · NON-STANDARD PRESS", mark:"01", word:"NIGHT\nSIGNAL", side:"A — 33⅓ RPM", info:"MSK–001 · STEREO" },
  { id:"r02", number:"02", name:"Pale Blue Ink", micro:"AIR RECORDS · TOKYO", mark:"", word:"水色の午後", side:"SIDE 1", info:"RAL–8801 / 33⅓" },
  { id:"r03", number:"03", name:"Alfa Signal Red", micro:"ALFA · MERZKAVA SOUND", mark:"1", word:"CITY\nAFTERGLOW", side:"STEREO 33⅓", info:"PRESSING No. 03" },
  { id:"r04", number:"04", name:"Classic Red Seal", micro:"MERZKAVA · ANALOG ARCHIVE", mark:"", word:"CBS\nMOONLIGHT", side:"SIDE A · 33⅓ RPM", info:"TOKYO · PRESSING 04–A" },
  { id:"r05", number:"05", name:"Pink Script", micro:"FLAT FACE · EDITION 05", mark:"", word:"soft\nreverie", side:"FACE A", info:"MINI LP SERIES · 33⅓" },
  { id:"r06", number:"06", name:"Illustrated Label", micro:"CROWN · MERZKAVA RECORDS", mark:"✦", word:"風の記憶", side:"CROWN · SIDE A", info:"ORL–0606 · MADE IN JP" },
  { id:"r07", number:"07", name:"Quiet Mono", micro:"QUIET ROOM SERIES", mark:"", word:"stillness", side:"A / 33⅓", info:"PIANO · TAPE · ROOM TONE" },
  { id:"r08", number:"08", name:"Deep Jazz Navy", micro:"BLUE NOTE MOOD · No. 08", mark:"", word:"MIDNIGHT\nSESSION", side:"SIDE A — STEREO", info:"TAKE 03 · 33⅓ RPM" },
  { id:"r09", number:"09", name:"Showa Burgundy", micro:"昭和音盤 · MERZKAVA", mark:"", word:"夢の余白", side:"A面 · 33⅓回転", info:"SHOWA ARCHIVE / 009" },
  { id:"r10", number:"10", name:"City Pop Sunset", micro:"SUNSET SOUND · TOKYO BAY", mark:"", word:"SUMMER\nWINDOW", side:"SIDE A · 33⅓", info:"MERZKAVA CITY SERIES" },
  { id:"r11", number:"11", name:"Tokyo Night Radio", micro:"TOKYO NIGHT RADIO · 011", mark:"◉", word:"深夜放送", side:"FM 00:17 · SIDE A", info:"AFTER HOURS / STEREO" },
  { id:"r12", number:"12", name:"Botanical Green", micro:"BOTANICAL SOUND LIBRARY", mark:"✧", word:"青葉の庭", side:"SIDE A · FIELD 12", info:"WIND / LEAVES / WATER" },
  { id:"r13", number:"13", name:"Sakura Letterpress", micro:"SAKURA PRESS · 春季限定", mark:"✿", word:"花明かり", side:"SIDE A", info:"SPRING EDITION · 33⅓" },
  { id:"r14", number:"14", name:"Seigaiha Wave", micro:"WAVE MOTION · JAPAN", mark:"〰", word:"潮騒 / SHIOSAI", side:"A SIDE · 33⅓ RPM", info:"OCEANIC STUDY No. 14" },
  { id:"r15", number:"15", name:"Washi / Wabi-sabi", micro:"KŌZO PAPER · HAND NUMBERED", mark:"朱", word:"木漏れ日", side:"SIDE A — 15/100", info:"HAND-PRESSED · 33⅓" },
  { id:"r16", number:"16", name:"Technical Matrix", micro:"MATRIX / MASTERING LOG", mark:"", word:"MKV—016", side:"A / 33⅓ / STEREO", info:"45° 17' · CUT 02 · PRESS 16" },
  { id:"r17", number:"17", name:"Synth Neon", micro:"NEON FUTURE · DIGITAL CITY", mark:"", word:"電脳夢", side:"SIDE A / 17", info:"LASER CUT · SYNTH ARCHIVE" },
  { id:"r18", number:"18", name:"Jade Archive", micro:"JADE HOUSE · SPIRIT TONES", mark:"✦", word:"翠玉の音", side:"A面 · 33⅓ RPM", info:"JADE SERIES · No. 018" },
  { id:"r19", number:"19", name:"Gold Foil Edition", micro:"GOLD MASTER · COLLECTOR PRESS", mark:"", word:"ETERNAL\nPATH", side:"SIDE A · No. 019", info:"LIMITED ARCHIVE / 33⅓" },
  { id:"r20", number:"20", name:"Cosmic Silver", micro:"COSMIC SOUND OBJECT · 020", mark:"✧", word:"星屑航路", side:"SIDE A · ORBIT 33⅓", info:"STELLAR PRESSING / STEREO" }
]);

export function createVinylDesignController({
  storage = globalThis.localStorage,
  onChange = () => {},
  random = Math.random
} = {}) {
  const read = (key, fallback) => {
    try {
      const value = storage?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch { return fallback; }
  };
  const write = (key, value) => {
    try { storage?.setItem(key, String(value)); } catch {}
  };
  const valid = id => VINYL_STYLES.some(style => style.id === id);
  let styleId = read("mp-vinyl-style", "");
  let mode = read("mp-vinyl-style-mode", "auto") === "manual" ? "manual" : "auto";
  let reason = "saved";
  if (!valid(styleId)) {
    const initial = VINYL_STYLES[Math.floor(Math.max(0, Math.min(0.999999, Number(random()) || 0)) * VINYL_STYLES.length)];
    styleId = initial.id;
    mode = "auto";
    write("mp-vinyl-style", styleId);
    write("mp-vinyl-style-mode", mode);
  }

  const currentStyle = () => VINYL_STYLES.find(style => style.id === styleId) || VINYL_STYLES[0];
  const getState = () => ({ id:styleId, mode, reason, style:currentStyle() });
  const notify = () => { try { onChange(getState()); } catch {} };

  function choose(id) {
    if (!valid(id)) return false;
    styleId = id;
    mode = "manual";
    reason = "manual";
    write("mp-vinyl-style", styleId);
    write("mp-vinyl-style-mode", mode);
    notify();
    return true;
  }

  function rotateRandom(nextReason = "track-end") {
    const choices = VINYL_STYLES.filter(style => style.id !== styleId);
    const value = Number(random());
    const index = Math.floor(Math.max(0, Math.min(0.999999, Number.isFinite(value) ? value : 0)) * choices.length);
    styleId = choices[index].id;
    mode = "auto";
    reason = nextReason;
    write("mp-vinyl-style", styleId);
    write("mp-vinyl-style-mode", mode);
    notify();
    return getState();
  }

  let lastSeasonKey = read("mp-vinyl-last-season", "");
  function onSeasonStart(seasonKey = "") {
    const key = String(seasonKey ?? "");
    if (key && key === lastSeasonKey) return false;
    if (key) {
      lastSeasonKey = key;
      write("mp-vinyl-last-season", key);
    }
    rotateRandom("season-start");
    return true;
  }

  function returnToAuto() {
    return rotateRandom("auto-enabled");
  }

  return { getState, choose, rotateRandom, onSeasonStart, returnToAuto };
}
