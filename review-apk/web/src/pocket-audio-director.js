const BUILT_IN_TRACKS = Object.freeze([
  { id:"happy", title:"Happy-1a", extension:"ADX", custom:false },
  { id:"chill", title:"chill-1a", extension:"ADX", custom:false },
  { id:"retroatrical1", title:"Retroatrical-1", extension:"ADX", custom:false },
  { id:"retroatrical2", title:"Retroatrical-2", extension:"ADX", custom:false },
  { id:"officialtheme1", title:"Merzkava Official Theme - 1", extension:"ADX", custom:false, official:true },
  { id:"officialtheme2", title:"Merzkava Official Theme - 2", extension:"ADX", custom:false, official:true },
  { id:"officialtheme3", title:"Merzkava Official Theme - 3", extension:"ADX", custom:false, official:true },
  { id:"officialtheme4", title:"Merzkava Official Theme - 4", extension:"ADX", custom:false, official:true },
  { id:"officialtheme5", title:"Merzkava Official Theme - 5", extension:"ADX", custom:false, official:true },
  { id:"officialtheme6", title:"Merzkava Official Theme - 6", extension:"ADX", custom:false, official:true },
  { id:"officialtheme7", title:"Merzkava Official Theme - 7", extension:"ADX", custom:false, official:true }
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
  startupEffectTimeoutMs = 6000,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout
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
  let motorRunning = false;
  let startupSequence = "idle";
  let startupWaitingForRecord = false;
  let startupNeedleRequested = false;
  let stylusContactPending = false;
  let startupTimeout = null;
  let startupRecordStarted = false;
  let custom = [];
  let pausePending = false;
  const channelGenerations = new Map();

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
    isLoading:isStarting(),
    pausePending,
    needleDown,
    motorRunning,
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
      clearTimeoutFn(startupTimeout);
      startupTimeout = null;
    }
  }

  function fail(message) {
    nativeStatus = "error";
    nativeError = String(message || "CRI audio could not complete the request.");
    pausePending = false;
    needleDown = false;
    motorRunning = false;
    if (startupSequence !== "idle" && startupSequence !== "complete") {
      startupSequence = "error";
      startupWaitingForRecord = false;
      stylusContactPending = false;
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
    nativeStatus = "preparing";
    needleDown = false;
    motorRunning = false;
    stylusContactPending = false;
    ambienceRequested = false;
    ambienceStatus = "idle";
    notify();
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
    startupSequence = "music";
    startupNeedleRequested = false;
    needleDown = false;
    motorRunning = false;
    stylusContactPending = false;
    notify();
    const accepted = requestTrackStart();
    if (!accepted) startupSequence = "error";
    notify();
    return accepted;
  }

  function finishStartupRecord(status) {
    if (!startupWaitingForRecord) return;
    if ((status === "idle" || status === "ended") && !startupRecordStarted) return;
    startupWaitingForRecord = false;
    startupRecordStarted = false;
    clearStartupTimeout();
    startupSequence = status === "error" ? "error" : "complete";
    notify();
  }

  function updateNativeState(channel, nextStatus, nextError = "", generation = null) {
    const next = String(nextStatus || "idle").toLowerCase();
    if (generation !== null && generation !== undefined) {
      const token = Number(generation);
      if (!Number.isSafeInteger(token) || token < 0) return;
      const last = channelGenerations.get(channel);
      if (last !== undefined && token < last) return;
      channelGenerations.set(channel, token);
    }
    if (channel === "record") {
      if (!startupWaitingForRecord) return;
      if (next === "playing") {
        startupRecordStarted = true;
        if (startupTimeout === null) {
          startupTimeout = setTimeoutFn(() => {
            if (startupWaitingForRecord) finishStartupRecord("timeout");
          }, Math.max(1000, Number(startupEffectTimeoutMs) || 6000));
        }
      } else if (next === "ended" || next === "error") finishStartupRecord(next);
      return;
    }
    if (channel === "stylus") {
      if (stylusContactPending && (next === "playing" || next === "error")) {
        stylusContactPending = false;
        if (next === "playing" && isPlaying() && motorRunning && !pausePending) {
          needleDown = true;
          ensureAmbienceForPlayingMusic();
        }
        notify();
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
    if (next === "cycle") { onPlaybackCycle(); return; }

    nativeStatus = next;
    nativeError = String(nextError || "");
    if (next === "preparing") {
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
      ambienceStatus = "idle";
    } else if (next === "ended") {
      pausePending = false;
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
      onPlaybackCycle();
    } else if (next === "error") {
      if (!nativeError) nativeError = "CRI playback failed.";
      pausePending = false;
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
      native?.criStopMusic?.();
      startupWaitingForRecord = false;
      clearStartupTimeout();
      if (startupSequence !== "idle") startupSequence = "error";
    } else if (next === "idle") {
      pausePending = false;
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
    } else if (next === "paused") {
      pausePending = true;
      needleDown = false;
      stylusContactPending = false;
    } else if (next === "playing") {
      pausePending = false;
      needleDown = false;
      motorRunning = true;
      stylusContactPending = true;
      if (startupSequence === "music") {
        startupSequence = "record-placement";
        startupWaitingForRecord = true;
        startupRecordStarted = false;
        if (!playEffect("record-placement")) {
          startupWaitingForRecord = false;
          startupSequence = "complete";
        }
      }
    }
    notify();
  }

  function selectTrack(id) {
    const track = getTracks().find(item => item.id === id);
    if (!track || selectedTrack === track.id) return false;
    const previousTrack = selectedTrack;
    const previousNeedleDown = needleDown;
    const previousMotorRunning = motorRunning;
    const previousStatus = nativeStatus;
    const previousPausePending = pausePending;
    const wasPaused = isPaused();
    const wasPlaying = needleDown || isPlaying() || isStarting() || motorRunning;
    selectedTrack = track.id;
    writeStored("mp-audio-track", selectedTrack);
    nativeError = "";
    startupWaitingForRecord = false;
    startupRecordStarted = false;
    clearStartupTimeout();
    startupSequence = "idle";
    const replaceActivePlayback = wasPlaying || wasPaused;
    if (replaceActivePlayback) {
      pausePending = true;
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
      ambienceStatus = "idle";
      if (!wasPaused) {
        const paused = native?.criPauseMusic?.(true) === true;
        if (!paused) {
          selectedTrack = previousTrack;
          writeStored("mp-audio-track", selectedTrack);
          nativeStatus = previousStatus;
          pausePending = previousPausePending;
          needleDown = previousNeedleDown;
          motorRunning = previousMotorRunning;
          notify();
          return false;
        }
      }
      if (!requestTrackStart()) {
        selectedTrack = previousTrack;
        writeStored("mp-audio-track", selectedTrack);
        nativeStatus = "error";
        pausePending = previousPausePending;
        needleDown = false;
        motorRunning = false;
        stylusContactPending = false;
        notify();
        return false;
      }
    } else notify();
    return true;
  }

  function startPlayback() {
    if ((needleDown && (isPlaying() || isStarting())) || (isStarting() && !needleDown)) return true;
    needleDown = false;
    stylusContactPending = false;
    if (isPaused()) {
      if (typeof native?.criPauseMusic !== "function") {
        needleDown = false;
        return fail("CRI pause control is unavailable.");
      }
      pausePending = false;
      nativeStatus = "preparing";
      motorRunning = false;
      notify();
      const resumed = native.criPauseMusic(false) === true;
      if (!resumed) {
        pausePending = true;
        needleDown = false;
        return fail("CRI could not resume the selected record.");
      }
      return true;
    }
    pausePending = false;
    nativeStatus = "preparing";
    motorRunning = false;
    notify();
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
    if (needleDown || isPlaying() || isStarting()) {
      pausePending = true;
      needleDown = false;
      stylusContactPending = false;
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

  function mediaPlay() {
    if (isPlaying() || isStarting()) return true;
    return startPlayback();
  }

  function mediaPause() {
    if (needleDown || isPlaying() || isStarting()) return toggleNeedle();
    return true;
  }

  function selectRelativeTrack(direction) {
    const tracks = getTracks();
    if (tracks.length < 2) return false;
    const current = tracks.findIndex(track => track.id === selectedTrack);
    const index = current < 0 ? 0 : current;
    const next = (index + direction + tracks.length) % tracks.length;
    return selectTrack(tracks[next].id);
  }

  function handleMediaControl(command) {
    switch (String(command || "").toLowerCase()) {
      case "play": return mediaPlay();
      case "pause": return mediaPause();
      case "toggle": return toggleNeedle();
      case "previous": return selectRelativeTrack(-1);
      case "next": return selectRelativeTrack(1);
      case "rewind": return native?.criSeekMusicRelative?.(-10000) === true;
      case "forward": return native?.criSeekMusicRelative?.(10000) === true;
      default: return false;
    }
  }

  function playEffect(name) {
    const effect = String(name || "").trim().toLowerCase();
    if (!["stylus-drop","record-placement","door-chime","door-rattle"].includes(effect)) return false;
    if ((effect === "stylus-drop" || effect === "record-placement") &&
        (!isPlaying() || !motorRunning || pausePending)) return false;
    return native?.criPlayEffect?.(effect) === true;
  }

  function startStartupSequence() {
    if (startupSequence !== "idle") return false;
    startupSequence = "music";
    startupWaitingForRecord = false;
    startupNeedleRequested = false;
    startupRecordStarted = false;
    pausePending = false;
    needleDown = false;
    motorRunning = false;
    stylusContactPending = false;
    notify();
    // BGM is prepared first; mechanical cues unlock only on native PLAYING.
    const accepted = requestTrackStart();
    if (!accepted) {
      startupSequence = "error";
      notify();
      return false;
    }
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
    handleMediaControl,
    playEffect,
    setMusicVolume,
    setAmbienceVolume,
    setEffectsVolume,
    stop() {
      clearStartupTimeout();
      startupWaitingForRecord = false;
      startupRecordStarted = false;
      startupSequence = "cancelled";
      needleDown = false;
      motorRunning = false;
      stylusContactPending = false;
      ambienceRequested = false;
      native?.criStopMusic?.();
      notify();
    }
  };
}
