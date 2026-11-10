const BUILT_IN_TRACKS = Object.freeze([
  { id:"happy", title:"Happy-1a", extension:"ADX", custom:false },
  { id:"chill", title:"chill-1a", extension:"ADX", custom:false },
  { id:"retroatrical1", title:"Retroatrical-1", extension:"ADX", custom:false },
  { id:"retroatrical2", title:"Retroatrical-2", extension:"ADX", custom:false }
]);

const clampVolume = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const readStored = (key, fallback) => {
  try { return globalThis.localStorage?.getItem(key) ?? fallback; }
  catch { return fallback; }
};
const writeStored = (key, value) => {
  try { globalThis.localStorage?.setItem(key, String(value)); } catch {}
};

export function createPocketAudioDirector({
  native = globalThis.window?.PocketNative ?? null,
  customTracks = [],
  onChange = () => {},
  onPlaybackCycle = () => {},
  startupEffectTimeoutMs = 6000
} = {}) {
  let selectedTrack = readStored("mp-audio-track", "happy");
  let musicVolume = clampVolume(readStored("mp-audio-music-volume", "68"));
  let ambienceVolume = clampVolume(readStored("mp-audio-ambience-volume", "34"));
  let effectsVolume = clampVolume(readStored("mp-audio-effects-volume", "76"));
  let nativeStatus = "idle";
  let nativeError = "";
  let ambienceStatus = "idle";
  let ambienceRequested = false;
  let needleDown = false;
  let startupSequence = "idle";
  let startupWaitingForRecord = false;
  let startupWaitingForStylus = false;
  let startupNeedleRequested = false;
  let startupTimeout = null;
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

  const getTracks = () => [...BUILT_IN_TRACKS, ...custom];
  const getTrack = (id = selectedTrack) => getTracks().find(track => track.id === id) || BUILT_IN_TRACKS[0];
  const isPlaying = () => nativeStatus === "playing";
  const isStarting = () => nativeStatus === "preparing";
  const isPaused = () => nativeStatus === "paused";
  const notify = () => { try { onChange(getState()); } catch {} };
  const getState = () => ({
    track:selectedTrack,
    title:getTrack().title,
    isPlaying:isPlaying(),
    isStarting:isStarting(),
    isPaused:isPaused(),
    needleDown,
    status:nativeStatus,
    error:nativeError,
    startupSequence,
    musicVolume,
    ambienceVolume,
    ambienceStatus,
    effectsVolume,
    tracks:getTracks()
  });

  function clearStartupTimeout() {
    if (startupTimeout !== null) {
      clearTimeout(startupTimeout);
      startupTimeout = null;
    }
  }

  function fail(message) {
    nativeStatus = "error";
    nativeError = String(message || "CRI audio could not complete the request.");
    needleDown = false;
    if (startupSequence !== "idle" && startupSequence !== "complete") {
      startupSequence = "error";
      startupWaitingForRecord = false;
      startupWaitingForStylus = false;
      clearStartupTimeout();
    }
    notify();
    return false;
  }

  function requestTrackStart() {
    if (!native || typeof native.criPlayTrack !== "function") {
      return fail("The native CRI audio runtime is unavailable.");
    }
    nativeError = "";
    const accepted = native.criPlayTrack(selectedTrack) === true;
    return accepted ? true : fail("CRI could not prepare the selected record.");
  }

  function updateCustomTracks(values) {
    custom = normalizeCustomTracks(values);
    if (!getTracks().some(track => track.id === selectedTrack)) {
      selectedTrack = "happy";
      writeStored("mp-audio-track", selectedTrack);
    }
    notify();
  }

  function ensureAmbienceForPlayingMusic() {
    if (!isPlaying() || ambienceRequested) return false;
    if (typeof native?.criPlayAmbience !== "function") {
      ambienceStatus = "error";
      notify();
      return false;
    }
    const accepted = native.criPlayAmbience() === true;
    ambienceRequested = accepted;
    if (!accepted) ambienceStatus = "error";
    return accepted;
  }

  function startStartupBgm() {
    clearStartupTimeout();
    startupWaitingForRecord = false;
    startupWaitingForStylus = false;
    startupSequence = "music";
    startupNeedleRequested = false;
    needleDown = true;
    notify();
    const accepted = requestTrackStart();
    if (!accepted) startupSequence = "error";
    notify();
    return accepted;
  }

  function finishStartupRecord(status) {
    if (!startupWaitingForRecord) return;
    startupWaitingForRecord = false;
    clearStartupTimeout();
    if (status === "ended" && startupNeedleRequested) {
      startupSequence = "stylus-drop";
      startupWaitingForStylus = true;
      needleDown = true;
      notify();
      if (!playEffect("stylus-drop")) {
        startupWaitingForStylus = false;
        startStartupBgm();
      }
      return;
    }
    startStartupBgm();
  }

  function finishStartupStylus() {
    if (!startupWaitingForStylus) return;
    startupWaitingForStylus = false;
    if (startupNeedleRequested) {
      startStartupBgm();
    } else {
      startupSequence = "cancelled";
      needleDown = false;
      notify();
    }
  }

  function updateNativeState(channel, nextStatus, nextError = "") {
    const next = String(nextStatus || "idle").toLowerCase();

    if (channel === "record") {
      if (startupWaitingForRecord && ["ended","error","idle"].includes(next)) {
        finishStartupRecord(next);
      }
      return;
    }

    if (channel === "stylus") {
      if (startupWaitingForStylus && ["ended","error","idle"].includes(next)) {
        finishStartupStylus();
      }
      return;
    }

    if (channel === "vinyl-crackle") {
      ambienceStatus = next;
      if (next === "preparing" || next === "playing" || next === "paused") ambienceRequested = true;
      else if (next === "error") ambienceRequested = false;
      else if (next === "idle" && !isPlaying() && !isStarting() && !isPaused()) ambienceRequested = false;
      notify();
      return;
    }

    if (channel !== "music") return;
    if (next === "cycle") {
      onPlaybackCycle();
      return;
    }

    nativeStatus = next;
    nativeError = String(nextError || "");
    if (next === "ended") {
      needleDown = false;
      onPlaybackCycle();
    } else if (next === "error") {
      if (!nativeError) nativeError = "CRI playback failed.";
      needleDown = false;
      ambienceRequested = false;
      native?.criStopMusic?.();
      if (startupSequence === "music") startupSequence = "error";
    } else if (next === "idle") {
      needleDown = false;
      ambienceRequested = false;
    } else if (next === "paused") {
      needleDown = false;
    } else if (next === "playing") {
      needleDown = true;
      if (startupSequence === "music") startupSequence = "complete";
      ensureAmbienceForPlayingMusic();
    }
    notify();
  }

  function selectTrack(id) {
    const track = getTracks().find(item => item.id === id);
    if (!track || selectedTrack === track.id) return false;

    const previousTrack = selectedTrack;
    selectedTrack = track.id;
    writeStored("mp-audio-track", selectedTrack);
    nativeError = "";

    const startupEffectInFlight = startupWaitingForRecord || startupWaitingForStylus;
    const replaceActivePlayback = !startupEffectInFlight &&
      (needleDown || isPlaying() || isStarting() || isPaused());

    if (replaceActivePlayback && !requestTrackStart()) {
      selectedTrack = previousTrack;
      writeStored("mp-audio-track", selectedTrack);
      notify();
      return false;
    }
    notify();
    return true;
  }

  function startPlayback() {
    if (needleDown && (isPlaying() || isStarting())) return true;

    needleDown = true;
    notify();
    playEffect("stylus-drop");

    if (isPaused()) {
      if (typeof native?.criPauseMusic !== "function") {
        needleDown = false;
        return fail("CRI pause control is unavailable.");
      }
      const resumed = native.criPauseMusic(false) === true;
      if (!resumed) {
        needleDown = false;
        return fail("CRI could not resume the selected record.");
      }
      return true;
    }

    const accepted = requestTrackStart();
    if (!accepted) {
      needleDown = false;
      notify();
    }
    return accepted;
  }

  function toggleNeedle() {
    if (startupWaitingForRecord) {
      startupNeedleRequested = !startupNeedleRequested;
      notify();
      return true;
    }
    if (startupWaitingForStylus) {
      startupNeedleRequested = !startupNeedleRequested;
      needleDown = startupNeedleRequested;
      notify();
      return true;
    }

    if (needleDown || isPlaying()) {
      needleDown = false;
      notify();
      if (typeof native?.criPauseMusic !== "function") {
        needleDown = true;
        return fail("CRI pause control is unavailable.");
      }
      const paused = native.criPauseMusic(true) === true;
      if (!paused) {
        needleDown = true;
        return fail("CRI could not pause the selected record.");
      }
      return true;
    }
    return startPlayback();
  }

  function playEffect(name) {
    const effect = String(name || "").trim().toLowerCase();
    if (!["stylus-drop","record-placement","door-chime","door-rattle"].includes(effect)) return false;
    return native?.criPlayEffect?.(effect) === true;
  }

  function startStartupSequence() {
    if (startupSequence !== "idle") return false;
    startupSequence = "record-placement";
    startupWaitingForRecord = true;
    startupNeedleRequested = false;
    notify();

    const accepted = playEffect("record-placement");
    if (!accepted) {
      startupWaitingForRecord = false;
      startStartupBgm();
      return true;
    }

    // The one-shot CRI record-placement cue normally signals its own END state.
    // This guard prevents a broken/missing callback from keeping startup silent forever.
    startupTimeout = setTimeout(() => {
      if (startupWaitingForRecord) finishStartupRecord("timeout");
    }, Math.max(1000, Number(startupEffectTimeoutMs) || 6000));
    return true;
  }

  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    writeStored("mp-audio-music-volume", musicVolume);
    native?.criSetVolume?.("music", musicVolume);
    notify();
  }

  function setAmbienceVolume(value) {
    ambienceVolume = clampVolume(value);
    writeStored("mp-audio-ambience-volume", ambienceVolume);
    native?.criSetVolume?.("ambience", ambienceVolume);
    notify();
  }

  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    writeStored("mp-audio-effects-volume", effectsVolume);
    native?.criSetVolume?.("effects", effectsVolume);
    notify();
  }

  updateCustomTracks(customTracks);
  // Apply persisted mixer levels before any startup or user-requested playback.
  native?.criSetVolume?.("music", musicVolume);
  native?.criSetVolume?.("ambience", ambienceVolume);
  native?.criSetVolume?.("effects", effectsVolume);

  return {
    getState,
    getTracks,
    updateCustomTracks,
    updateNativeState,
    selectTrack,
    startPlayback,
    startStartupSequence,
    toggleNeedle,
    playEffect,
    setMusicVolume,
    setAmbienceVolume,
    setEffectsVolume,
    stop() {
      clearStartupTimeout();
      startupWaitingForRecord = false;
      startupWaitingForStylus = false;
      startupSequence = "cancelled";
      needleDown = false;
      ambienceRequested = false;
      native?.criStopMusic?.();
      notify();
    }
  };
}
