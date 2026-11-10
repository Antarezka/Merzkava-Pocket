const BUILT_IN_TRACKS = Object.freeze([
  { id:"happy", title:"Happy-1a", file:"Happy-1a.adx", custom:false },
  { id:"chill", title:"chill-1a", file:"chill-1a.adx", custom:false },
  { id:"retroatrical1", title:"Retroatrical-1", file:"Retroatrical-1.adx", custom:false },
  { id:"retroatrical2", title:"Retroatrical-2", file:"Retroatrical-2.adx", custom:false }
]);

const clampVolume = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const readStored = (key, fallback) => {
  try { return globalThis.localStorage?.getItem(key) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { globalThis.localStorage?.setItem(key, String(value)); } catch {}
};

export function createPocketAudioController({
  customTracks = [],
  onChange = () => {},
  onPlaybackCycle = () => {}
} = {}) {
  const native = globalThis.window?.PocketNative ?? null;
  let selectedTrack = readStored("mp-audio-track", "happy");
  if (![...BUILT_IN_TRACKS.map(track => track.id)].includes(selectedTrack)) selectedTrack = "happy";
  let musicVolume = clampVolume(readStored("mp-audio-music-volume", "68"));
  let effectsVolume = clampVolume(readStored("mp-audio-effects-volume", "76"));
  let isPlaying = false;
  let isStarting = false;
  let isPaused = false;
  let status = "idle";
  let error = "";
  let inMainMenu = false;
  let latestNativeState = "";
  let custom = [];

  const normalizeCustomTracks = values => (Array.isArray(values) ? values : [])
    .filter(item => item && /^[a-f0-9-]{36}$/i.test(String(item.id || "")))
    .map(item => ({
      id:"custom:" + String(item.id).toLowerCase(),
      nativeId:String(item.id).toLowerCase(),
      title:String(item.title || "Untitled record").slice(0,80),
      extension:String(item.extension || "WAV").toUpperCase(),
      mimeType:String(item.mimeType || "audio/wav"),
      custom:true
    }));

  function getTracks() { return [...BUILT_IN_TRACKS, ...custom]; }
  function getTrack(id = selectedTrack) { return getTracks().find(track => track.id === id) || BUILT_IN_TRACKS[0]; }
  function notify() { onChange(getState()); }
  function getState() {
    const current = getTrack();
    return {
      track:selectedTrack,
      title:current.title,
      isPlaying,
      isStarting,
      isPaused,
      status,
      error,
      musicVolume,
      effectsVolume,
      tracks:getTracks()
    };
  }

  function updateCustomTracks(values) {
    custom = normalizeCustomTracks(values);
    if (!getTracks().some(track => track.id === selectedTrack)) selectedTrack = "happy";
    notify();
  }

  function updateNativeState(channel, nextStatus, nextError = "") {
    if (channel !== "music") return;
    const next = String(nextStatus || "idle").toLowerCase();
    latestNativeState = next;
    error = String(nextError || "");
    status = next;
    isStarting = next === "preparing";
    isPlaying = next === "playing";
    isPaused = next === "paused";
    if (next === "ended" || next === "idle") {
      isPlaying = false;
      isStarting = false;
      isPaused = false;
      if (next === "ended") onPlaybackCycle();
    }
    if (next === "error") {
      isPlaying = false;
      isStarting = false;
      isPaused = false;
      if (!error) error = "CRI playback failed.";
    }
    notify();
  }

  function selectTrack(id) {
    const track = getTrack(id);
    if (!track || track.id !== id || selectedTrack === track.id) return false;
    selectedTrack = track.id;
    writeStored("mp-audio-track", selectedTrack);
    error = "";
    if (isPlaying || isStarting || isPaused) {
      isStarting = true;
      isPlaying = false;
      isPaused = false;
      status = "preparing";
      const nativeId = track.id;
      const accepted = native?.playPocketAudio?.(nativeId) === true;
      if (!accepted) {
        isStarting = false;
        status = "error";
        error = "CRI could not load this record.";
      }
    }
    notify();
    return true;
  }

  function startPlayback() {
    if (!native || typeof native.playPocketAudio !== "function") {
      status = "error";
      error = "The native CRI audio runtime is unavailable.";
      notify();
      return false;
    }
    const track = getTrack();
    isStarting = true;
    isPaused = false;
    isPlaying = false;
    status = "preparing";
    error = "";
    notify();
    native.playPocketSound?.("needle");
    const started = native.playPocketAudio(track.id) === true;
    if (!started) {
      isStarting = false;
      status = "error";
      error = "CRI could not prepare the selected record.";
      notify();
      return false;
    }
    native.startPocketAmbience?.();
    return true;
  }

  function toggleNeedle() {
    if (isPlaying || isStarting) {
      native?.pausePocketAudio?.(true);
      isPlaying = false;
      isStarting = false;
      isPaused = true;
      status = "paused";
      notify();
      return true;
    }
    if (isPaused) {
      native?.pausePocketAudio?.(false);
      isPaused = false;
      isStarting = true;
      status = "preparing";
      notify();
      return true;
    }
    return startPlayback();
  }

  function playEffect(name) {
    if (name === "placement") return native?.playPocketSound?.("placement") === true;
    return false;
  }

  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    writeStored("mp-audio-music-volume", musicVolume);
    native?.setPocketAudioVolume?.("music", musicVolume);
    notify();
  }

  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    writeStored("mp-audio-effects-volume", effectsVolume);
    native?.setPocketAudioVolume?.("effects", effectsVolume);
    notify();
  }

  function enterMainMenu() {
    inMainMenu = true;
  }

  function leaveMainMenu() {
    inMainMenu = false;
  }

  updateCustomTracks(customTracks);

  return {
    getState,
    getTracks,
    updateCustomTracks,
    updateNativeState,
    selectTrack,
    toggleNeedle,
    playEffect,
    setMusicVolume,
    setEffectsVolume,
    enterMainMenu,
    leaveMainMenu,
    stop() {
      native?.stopPocketAudio?.();
      isPlaying = false;
      isStarting = false;
      isPaused = false;
      status = "idle";
      notify();
    }
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
