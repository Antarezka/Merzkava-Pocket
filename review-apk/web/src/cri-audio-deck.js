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

export function createCriAudioDeck({
  native = globalThis.window?.PocketNative ?? null,
  customTracks = [],
  onChange = () => {},
  onPlaybackCycle = () => {}
} = {}) {
  let selectedTrack = readStored("mp-audio-track", "happy");
  let musicVolume = clampVolume(readStored("mp-audio-music-volume", "68"));
  let effectsVolume = clampVolume(readStored("mp-audio-effects-volume", "76"));
  let nativeStatus = "idle";
  let nativeError = "";
  let custom = [];
  let automaticStartRequested = false;

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
  const getState = () => ({
    track:selectedTrack,
    title:getTrack().title,
    isPlaying:isPlaying(),
    isStarting:isStarting(),
    isPaused:isPaused(),
    status:nativeStatus,
    error:nativeError,
    musicVolume,
    effectsVolume,
    tracks:getTracks()
  });
  const notify = () => { try { onChange(getState()); } catch {} };

  function fail(message) {
    nativeStatus = "error";
    nativeError = String(message || "CRI audio could not complete the request.");
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

  function updateNativeState(channel, nextStatus, nextError = "") {
    if (channel !== "music") return;
    const next = String(nextStatus || "idle").toLowerCase();
    if (next === "cycle") {
      onPlaybackCycle();
      return;
    }
    nativeStatus = next;
    nativeError = String(nextError || "");
    if (next === "ended") onPlaybackCycle();
    if (next === "error" && !nativeError) nativeError = "CRI playback failed.";
    notify();
  }

  function selectTrack(id) {
    const track = getTracks().find(item => item.id === id);
    if (!track || selectedTrack === track.id) return false;

    const replaceActivePlayback = isPlaying() || isStarting() || isPaused();
    selectedTrack = track.id;
    writeStored("mp-audio-track", selectedTrack);
    nativeError = "";

    if (replaceActivePlayback && !requestTrackStart()) return false;
    notify();
    return true;
  }

  function startPlayback() {
    if (isPlaying() || isStarting()) return true;
    if (isPaused()) {
      if (typeof native?.criPauseMusic !== "function") return fail("CRI pause control is unavailable.");
      playEffect("stylus-drop");
      native.criPauseMusic(false);
      return true;
    }
    playEffect("stylus-drop");
    return requestTrackStart();
  }

  function toggleNeedle() {
    if (isPlaying() || isStarting()) {
      if (typeof native?.criPauseMusic !== "function") return fail("CRI pause control is unavailable.");
      native.criPauseMusic(true);
      return true;
    }
    return startPlayback();
  }

  function playEffect(name) {
    const effect = String(name || "").trim().toLowerCase();
    if (!["stylus-drop","record-placement","door-chime","door-rattle"].includes(effect)) return false;
    return native?.criPlayEffect?.(effect) === true;
  }

  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    writeStored("mp-audio-music-volume", musicVolume);
    native?.criSetVolume?.("music", musicVolume);
    notify();
  }

  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    writeStored("mp-audio-effects-volume", effectsVolume);
    native?.criSetVolume?.("effects", effectsVolume);
    notify();
  }

  function startAutomatically() {
    if (automaticStartRequested) return false;
    automaticStartRequested = true;
    // Startup BGM has no visible stylus interaction yet. Keep stylus-drop
    // SFX tied to an actual user pressing the on-screen needle.
    return requestTrackStart();
  }

  updateCustomTracks(customTracks);
  // Apply persisted mixer levels to the native CRI channels before any
  // automatic startup playback request is issued.
  native?.criSetVolume?.("music", musicVolume);
  native?.criSetVolume?.("effects", effectsVolume);

  return {
    getState,
    getTracks,
    updateCustomTracks,
    updateNativeState,
    selectTrack,
    startPlayback,
    startAutomatically,
    toggleNeedle,
    playEffect,
    setMusicVolume,
    setEffectsVolume,
    stop() {
      native?.criStopMusic?.();
    }
  };
}
