const TRACKS = Object.freeze({
  happy: { title: "Happy-1a", src: "/audio/Happy-1a.ogg" },
  chill: { title: "chill-1a", src: "/audio/chill-1a.ogg" },
  retroatrical2: { title: "Retroatrical-2", src: "/audio/Retroatrical-2.ogg" },
  retroatricalA1: { title: "Retroatrical-1", src: "/audio/Retroatrical-1.ogg" }
});

const EFFECTS = Object.freeze({
  needle: "/audio/needle%20drop%2Bvinyls%20crackle.mp3",
  placement: "/audio/record%20placement.mp3"
});

export const VINYL_SURFACE_NOISE_SRC = "/audio/vinyl-surface-noise.ogg";
const VINYL_SURFACE_NOISE_GAIN = 0.16;
const MUSIC_FADE_DURATION_MS = 2200;
const MUSIC_FADE_TICK_MS = 24;
const MUSIC_FADE_END_SAFETY_MS = 140;

export const SUPPORTED_AUDIO_EXTENSIONS = Object.freeze([
  "ogg", "oga", "opus", "mp3", "wav", "wave", "m4a", "aac", "flac", "3gp", "amr"
]);

export const AUDIO_PLAYBACK_TYPES = Object.freeze([
  'audio/ogg; codecs="vorbis"',
  'audio/ogg; codecs="opus"',
  "audio/mpeg",
  "audio/wav",
  'audio/mp4; codecs="mp4a.40.2"',
  "audio/aac",
  "audio/flac",
  "audio/3gpp",
  "audio/amr"
]);

const supportedAudioExtensionSet = new Set(SUPPORTED_AUDIO_EXTENSIONS);

export function getSupportedAudioPlaybackTypes(audioElement = globalThis.document?.createElement?.("audio")) {
  if (!audioElement || typeof audioElement.canPlayType !== "function") return [];
  return AUDIO_PLAYBACK_TYPES.filter(type => {
    try { return audioElement.canPlayType(type) !== ""; }
    catch { return false; }
  });
}

const clampVolume = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));


function createNativePocketAudioController({
  AudioCtor,
  storage,
  onChange = () => {},
  onPlaybackCycle = () => {},
  customTracks = [],
  nativeBridge,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout
} = {}) {
  if (typeof AudioCtor !== "function") throw new Error("Audio effects are unavailable.");
  const read = (key, fallback) => {
    try {
      const value = storage?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch { return fallback; }
  };
  const write = (key, value) => {
    try { storage?.setItem(key, String(value)); } catch {}
  };
  const parse = value => {
    if (value && typeof value === "object") return value;
    try { return JSON.parse(String(value || "{}")); } catch { return {}; }
  };

  let trackCatalog = { ...TRACKS };
  const normalizeCustomTracks = entries => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      const id = String(entry?.id ?? "");
      const title = String(entry?.title ?? "").trim();
      const extension = String(entry?.extension ?? entry?.ext ?? "ogg")
        .trim().toLowerCase().replace(/^\./, "");
      const mimeType = String(entry?.mimeType ?? "audio/ogg").trim().toLowerCase();
      if (!/^[a-f0-9-]{36}$/i.test(id) || !title ||
          !supportedAudioExtensionSet.has(extension) || !mimeType.startsWith("audio/")) continue;
      trackCatalog[id] = {
        title, extension, mimeType,
        src: "https://pocket.local/user-audio/" + id + "." + extension,
        custom: true
      };
    }
  };
  normalizeCustomTracks(customTracks);

  let selectedTrack = String(read("mp-audio-track", "happy"));
  if (!Object.hasOwn(trackCatalog, selectedTrack)) selectedTrack = "happy";
  let musicVolume = clampVolume(read("mp-audio-music-volume", 68));
  let effectsVolume = clampVolume(read("mp-audio-effects-volume", 76));
  let menuEntered = false;
  let userPaused = false;
  let lifecycleSuspended = false;
  let floatingModeActive = false;
  let resumeAfterSplash = false;
  let needleStarting = false;
  let needleToken = 0;
  let activeNeedleEffect = null;
  let nativePlaying = false;
  let nativeStarting = false;
  let nativeTrackId = "";
  let nativeStartWatchdog = null;
  let nativeStartToken = 0;
  let nativeStartError = "";
  let disposed = false;

  const initialState = parse(nativeBridge.getPocketNativeMusicState?.());
  nativePlaying = initialState.playing === true;
  nativeStarting = initialState.preparing === true;
  nativeStartError = String(initialState.error || "");
  userPaused = initialState.userPaused === true;
  nativeTrackId = String(initialState.trackId || "");
  if (nativePlaying && Object.hasOwn(trackCatalog, nativeTrackId)) {
    selectedTrack = nativeTrackId;
    write("mp-audio-track", selectedTrack);
  }
  let lastCycleCount;
  const savedCycleCount = read("mp-audio-native-cycle-count", null);
  const storedCycleCount = Math.max(0, Number(initialState.cycleCount) || 0);
  lastCycleCount = savedCycleCount === null
    ? storedCycleCount
    : Math.max(0, Number(savedCycleCount) || 0);
  write("mp-audio-native-cycle-count", lastCycleCount);

  // The BGM is native; only the independent ambience and short effects stay in WebView.
  const vinylSurfaceNoise = new AudioCtor(VINYL_SURFACE_NOISE_SRC);
  vinylSurfaceNoise.preload = "auto";
  vinylSurfaceNoise.loop = true;
  vinylSurfaceNoise.volume = (effectsVolume / 100) * VINYL_SURFACE_NOISE_GAIN;

  const notify = () => {
    if (!disposed) { try { onChange(getState()); } catch {} }
  };
  const shouldMaintainPlayback = () => menuEntered && !userPaused && !lifecycleSuspended;
  const stopVinylSurfaceNoise = () => {
    try { vinylSurfaceNoise.pause(); } catch {}
    try { vinylSurfaceNoise.currentTime = 0; } catch {}
  };
  const syncVinylSurfaceNoise = () => {
    if (!shouldMaintainPlayback() || effectsVolume <= 0 || !nativePlaying) {
      stopVinylSurfaceNoise();
      return;
    }
    vinylSurfaceNoise.volume = (effectsVolume / 100) * VINYL_SURFACE_NOISE_GAIN;
    if (!vinylSurfaceNoise.paused) return;
    try {
      const result = vinylSurfaceNoise.play();
      result?.catch?.(() => stopVinylSurfaceNoise());
    } catch { stopVinylSurfaceNoise(); }
  };
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
    try { effect.play()?.catch?.(() => {}); } catch {}
    return effect;
  };
  const waitForEffect = effect => new Promise(resolve => {
    let finished = false;
    let fallback = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallback !== null) clearTimeoutFn(fallback);
      effect.removeEventListener?.("ended", finish);
      effect.removeEventListener?.("error", finish);
      effect.removeEventListener?.("pause", finish);
      resolve();
    };
    fallback = setTimeoutFn(finish, 5000);
    effect.addEventListener?.("ended", finish, { once: true });
    effect.addEventListener?.("error", finish, { once: true });
    effect.addEventListener?.("pause", finish, { once: true });
    if (effect.ended) finish();
  });
  const cancelNeedleStart = () => {
    needleToken += 1;
    needleStarting = false;
    const effect = activeNeedleEffect;
    activeNeedleEffect = null;
    if (effect) { try { effect.pause(); effect.currentTime = 0; } catch {} }
  };

  const reportCycles = count => {
    const next = Math.max(0, Number(count) || 0);
    if (next > lastCycleCount) {
      const missed = Math.min(30, next - lastCycleCount);
      for (let i = 0; i < missed; i += 1) {
        const id = nativeTrackId || selectedTrack;
        try { onPlaybackCycle({ track: id, title: trackCatalog[id]?.title || "" }); } catch {}
      }
    }
    lastCycleCount = next;
    write("mp-audio-native-cycle-count", lastCycleCount);
  };

  const clearNativeStartWatchdog = () => {
    nativeStartToken += 1;
    if (nativeStartWatchdog !== null) clearTimeoutFn(nativeStartWatchdog);
    nativeStartWatchdog = null;
  };
  const armNativeStartWatchdog = () => {
    clearNativeStartWatchdog();
    const token = nativeStartToken;
    nativeStartWatchdog = setTimeoutFn(() => {
      if (token !== nativeStartToken || !nativeStarting || disposed) return;
      nativeStartWatchdog = null;
      syncNativeState();
      if (!nativePlaying && nativeStarting) {
        nativeStarting = false;
        nativeStartError = "The native player did not confirm playback. Try the record again.";
        stopVinylSurfaceNoise();
        notify();
      }
    }, 15000);
  };

  const applyNativeState = state => {
    if (!state || typeof state !== "object") return;
    if (state.playing === true) {
      nativePlaying = true;
      nativeStarting = false;
      nativeStartError = "";
      clearNativeStartWatchdog();
      userPaused = false;
    } else if (state.playing === false) {
      // MediaSessionService emits an initial stopped/buffering snapshot before
      // ExoPlayer confirms playback. Do not mistake that handshake for failure
      // and issue another ACTION_PLAY while the first one is still preparing.
      if (!nativeStarting || state.preparing === false || state.error || state.stopped === true) {
        nativePlaying = false;
      }
      if (state.preparing === true) {
        nativeStarting = true;
        nativeStartError = "";
      } else if (state.preparing === false || state.error || state.stopped === true) {
        nativeStarting = false;
        clearNativeStartWatchdog();
      }
    }
    if (state.error) nativeStartError = String(state.error);
    // Generic service teardown (for splash/logout) is not a user pause.
    // Only MediaSession's explicit pause action should persist paused intent.
    if (state.userPaused === true) userPaused = true;
    const id = String(state.trackId || "");
    if (nativePlaying && id && Object.hasOwn(trackCatalog, id)) {
      nativeTrackId = id;
      selectedTrack = id;
      write("mp-audio-track", id);
    }
    if (state.cycleCount !== undefined) reportCycles(state.cycleCount);
    syncVinylSurfaceNoise();
    notify();
  };
  const syncNativeState = () => {
    try { applyNativeState(parse(nativeBridge.getPocketNativeMusicState?.())); }
    catch {}
    return nativePlaying;
  };

  function getState() {
    return {
      track: selectedTrack,
      title: trackCatalog[selectedTrack].title,
      musicVolume,
      effectsVolume,
      isPlaying: nativePlaying,
      isStarting: needleStarting || nativeStarting,
      error: nativeStartError,
      menuEntered
    };
  }
  const getTracks = () => Object.entries(trackCatalog).map(([id, track]) => ({
    id,
    title: track.title,
    extension: track.extension || "ogg",
    mimeType: track.mimeType || "audio/ogg",
    custom: track.custom === true
  }));

  function pauseMusic(userPause = true) {
    clearNativeStartWatchdog();
    nativeStarting = false;
    nativeStartError = "";
    try {
      if (typeof nativeBridge.pausePocketNativeMusic === "function") {
        nativeBridge.pausePocketNativeMusic(userPause === true);
      } else {
        nativeBridge.stopPocketNativeMusic?.();
      }
    } catch {}
    nativePlaying = false;
    stopVinylSurfaceNoise();
    notify();
  }
  function stopMusic() {
    clearNativeStartWatchdog();
    nativeStarting = false;
    nativeStartError = "";
    try { nativeBridge.stopPocketNativeMusic?.(); } catch {}
    nativePlaying = false;
    nativeTrackId = "";
    stopVinylSurfaceNoise();
    notify();
  }
  function startMusic() {
    if (!shouldMaintainPlayback()) return Promise.resolve(false);
    if (nativePlaying && nativeTrackId === selectedTrack) {
      syncVinylSurfaceNoise();
      return Promise.resolve(true);
    }
    // One pending native start is enough. Re-dispatching ACTION_PLAY during
    // ExoPlayer preparation repeatedly replaces the MediaItem and can trap
    // the interface in READY/PREPARING while the service restarts itself.
    if (nativeStarting) return Promise.resolve(false);
    const track = trackCatalog[selectedTrack];
    try {
      const result = parse(nativeBridge.startPocketNativeMusic(
        selectedTrack, track.title, track.src, musicVolume
      ));
      if (result.ok !== true) {
        clearNativeStartWatchdog();
        nativePlaying = false;
        nativeStarting = false;
        nativeStartError = String(result.message || "Pocket could not start the native player.");
        stopVinylSurfaceNoise();
        notify();
        return Promise.resolve(false);
      }
      nativeTrackId = selectedTrack;
      nativePlaying = false;
      nativeStarting = true;
      nativeStartError = "";
      armNativeStartWatchdog();
      notify();
      return Promise.resolve(true);
    } catch (error) {
      clearNativeStartWatchdog();
      nativePlaying = false;
      nativeStarting = false;
      nativeStartError = error instanceof Error ? error.message : "Pocket could not start the native player.";
      stopVinylSurfaceNoise();
      notify();
      return Promise.resolve(false);
    }
  }

  function enterMainMenu() {
    if (!menuEntered) {
      menuEntered = true;
      lifecycleSuspended = false;
      resumeAfterSplash = false;
      if (!userPaused) void startMusic();
      return;
    }
    lifecycleSuspended = false;
    if (resumeAfterSplash && !userPaused) {
      resumeAfterSplash = false;
      void startMusic();
    } else {
      resumeAfterSplash = false;
    }
  }
  function pauseForSplash() {
    resumeAfterSplash = shouldMaintainPlayback() && !needleStarting;
    if (needleStarting) userPaused = true;
    lifecycleSuspended = true;
    cancelNeedleStart();
    pauseMusic(false);
  }
  function resetSession() {
    lifecycleSuspended = false;
    floatingModeActive = false;
    menuEntered = false;
    cancelNeedleStart();
    stopMusic();
    userPaused = false;
    resumeAfterSplash = false;
  }
  function selectTrack(id) {
    if (!Object.hasOwn(trackCatalog, id) || id === selectedTrack) return false;
    cancelNeedleStart();
    pauseMusic(true);
    selectedTrack = id;
    userPaused = true;
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
    if (nativePlaying || nativeStarting || needleStarting) {
      cancelNeedleStart();
      userPaused = true;
      pauseMusic(true);
      return Promise.resolve(false);
    }
    return lowerNeedleAndPlay();
  }
  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    write("mp-audio-music-volume", musicVolume);
    try { nativeBridge.setPocketNativeMusicVolume?.(musicVolume); } catch {}
    notify();
  }
  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    write("mp-audio-effects-volume", effectsVolume);
    syncVinylSurfaceNoise();
    notify();
  }
  function setFloatingMode(active) {
    floatingModeActive = active === true;
    return Promise.resolve(nativePlaying);
  }
  function retryPendingPlayback() {
    // This is called for every document click. For native Media3, arbitrary
    // gestures must never create another ACTION_PLAY or restart a failed service.
    // More importantly, do not apply a cached userPaused=true snapshot while a
    // fresh needle gesture is already preparing its explicit play request.
    if (!shouldMaintainPlayback() || needleStarting || nativeStarting) return false;
    syncNativeState();
    return false;
  }
  function recoverAfterInterruption() {
    syncNativeState();
    return true;
  }
  function recoverAfterBackgroundTransition() {
    // Media3 owns playback independently of WebView visibility and Activity lifecycle.
    syncNativeState();
    return true;
  }
  function updateCustomTracks(entries) {
    const wasPlaying = nativePlaying && menuEntered && !userPaused;
    trackCatalog = { ...TRACKS };
    normalizeCustomTracks(entries);
    if (!Object.hasOwn(trackCatalog, selectedTrack)) {
      stopMusic();
      selectedTrack = "happy";
      write("mp-audio-track", selectedTrack);
      if (wasPlaying) {
        userPaused = false;
        void startMusic();
      }
    }
    notify();
    return getTracks();
  }

  const handleNativeState = event => applyNativeState(event?.detail || {});
  globalThis.addEventListener?.("pocket:native-audio-state", handleNativeState);
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
    setEffectsVolume,
    setFloatingMode,
    retryPendingPlayback,
    recoverAfterInterruption,
    recoverAfterBackgroundTransition,
    dispose() {
      disposed = true;
      clearNativeStartWatchdog();
      nativeStarting = false;
      globalThis.removeEventListener?.("pocket:native-audio-state", handleNativeState);
      stopVinylSurfaceNoise();
    }
  };
}

export function createPocketAudioController({
  AudioCtor = globalThis.Audio,
  storage = globalThis.localStorage,
  onChange = () => {},
  onPlaybackCycle = () => {},
  customTracks = [],
  now = () => Date.now(),
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  nativeBridge = globalThis.PocketNative
} = {}) {
  if (nativeBridge && typeof nativeBridge.startPocketNativeMusic === "function" &&
      typeof nativeBridge.stopPocketNativeMusic === "function") {
    return createNativePocketAudioController({ AudioCtor, storage, onChange, onPlaybackCycle, customTracks, nativeBridge, setTimeoutFn, clearTimeoutFn });
  }
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
      const extension = String(entry?.extension ?? entry?.ext ?? "ogg").trim().toLowerCase().replace(/^\./,"");
      const mimeType = String(entry?.mimeType ?? "audio/ogg").trim().toLowerCase();
      if (!/^[a-f0-9-]{36}$/i.test(id) || !title ||
          !supportedAudioExtensionSet.has(extension) || !mimeType.startsWith("audio/")) continue;
      trackCatalog[id] = {
        title,
        extension,
        mimeType,
        playbackType: String(entry?.playbackType ?? ""),
        src: "https://pocket.local/user-audio/" + id + "." + extension,
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
  let lifecycleSuspended = false;
  let floatingModeActive = false;
  let backgroundRecoveryToken = 0;
  let resumeAfterSplash = false;
  let needleStarting = false;
  let needleToken = 0;
  let activeNeedleEffect = null;
  let lastPlaybackDuration = 0;
  let activeSourceReady = false;
  let lastCycleNotification = 0;
  let vinylNoiseStartToken = 0;
  let musicFadeGain = 1;
  let musicFadeTimer = null;
  let musicFadeTick = null;
  let musicFadeToken = 0;
  let endFadeStarted = false;
  let musicStartPromise = null;
  let restartAfterStart = false;
  let playbackGeneration = 0;
  let trackEndTimer = null;
  let trackEndToken = 0;
  let endHandlingQueued = false;
  let playbackRetryTimer = null;
  let playbackRetryCount = 0;
  let playbackRetryPending = false;

  const music = new AudioCtor(trackCatalog[selectedTrack].src);
  music.preload = "auto";
  // Use the real ended event and restart one cycle after dispatch completes.
  // HTMLMediaElement suppresses ended when loop=true during forward playback.
  music.loop = false;
  music.volume = musicVolume / 100;
  // Dedicated ambience bed: independent of needle-drop and record-placement SFX.
  const vinylSurfaceNoise = new AudioCtor(VINYL_SURFACE_NOISE_SRC);
  vinylSurfaceNoise.preload = "auto";
  vinylSurfaceNoise.loop = true;
  vinylSurfaceNoise.volume = (effectsVolume / 100) * VINYL_SURFACE_NOISE_GAIN;

  const notify = () => onChange(getState());
  const isPlaying = () => music.paused === false && music.ended !== true;
  const shouldMaintainPlayback = () => menuEntered && !userPaused && !lifecycleSuspended;
  const applyMusicVolume = () => {
    music.volume = (musicVolume / 100) * musicFadeGain;
  };
  const stopMusicFade = () => {
    musicFadeToken += 1;
    if (musicFadeTimer !== null) clearIntervalFn(musicFadeTimer);
    musicFadeTimer = null;
    musicFadeTick = null;
  };
  const animateMusicFade = (targetGain, durationMs = MUSIC_FADE_DURATION_MS) => {
    stopMusicFade();
    const token = musicFadeToken;
    const fromGain = musicFadeGain;
    const startedAt = Math.max(0, Number(music.currentTime) || 0);
    const tick = () => {
      if (token !== musicFadeToken) return;
      // Use the media clock: wall-clock timers may be throttled or continue
      // advancing while Android temporarily pauses the actual audio element.
      const mediaPosition = Math.max(0, Number(music.currentTime) || 0);
      const elapsedMs = Math.max(0, (mediaPosition - startedAt) * 1000);
      const progress = durationMs <= 0
        ? 1
        : Math.max(0, Math.min(1, elapsedMs / durationMs));
      const eased = progress * progress * (3 - 2 * progress);
      musicFadeGain = fromGain + (targetGain - fromGain) * eased;
      applyMusicVolume();
      if (progress >= 1) {
        if (musicFadeTimer !== null) clearIntervalFn(musicFadeTimer);
        musicFadeTimer = null;
        musicFadeTick = null;
      }
    };
    musicFadeTick = tick;
    musicFadeTimer = setIntervalFn(tick, MUSIC_FADE_TICK_MS);
    tick();
  };
  const stopVinylSurfaceNoise = () => {
    // Invalidate any pending play() resolution before stopping and rewinding the ambience bed.
    vinylNoiseStartToken += 1;
    try { vinylSurfaceNoise.pause(); } catch {}
    try { vinylSurfaceNoise.currentTime = 0; } catch {}
  };
  const syncVinylSurfaceNoise = () => {
    // The ambience bed follows the user's playback intent, not the transient
    // paused/ended state of the music element. A failed automatic restart must
    // never silence the separate vinyl layer as a side effect.
    if (!shouldMaintainPlayback() || effectsVolume <= 0) {
      stopVinylSurfaceNoise();
      return;
    }
    vinylSurfaceNoise.volume = (effectsVolume / 100) * VINYL_SURFACE_NOISE_GAIN;
    if (!vinylSurfaceNoise.paused) return;
    const token = ++vinylNoiseStartToken;
    try {
      const result = vinylSurfaceNoise.play();
      result?.then?.(() => {
        if (token === vinylNoiseStartToken && (!shouldMaintainPlayback() || effectsVolume <= 0)) {
          stopVinylSurfaceNoise();
        }
      }).catch?.(() => {
        if (token === vinylNoiseStartToken) stopVinylSurfaceNoise();
      });
    } catch {
      if (token === vinylNoiseStartToken) stopVinylSurfaceNoise();
    }
  };
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
  const clearTrackEndGuard = () => {
    trackEndToken += 1;
    if (trackEndTimer !== null) clearTimeoutFn(trackEndTimer);
    trackEndTimer = null;
  };
  const clearPlaybackRetry = () => {
    if (playbackRetryTimer !== null) clearTimeoutFn(playbackRetryTimer);
    playbackRetryTimer = null;
  };
  const schedulePlaybackRetry = () => {
    if (!shouldMaintainPlayback() || playbackRetryTimer !== null) return;
    const delays = [180, 480, 1200];
    if (playbackRetryCount >= delays.length) {
      playbackRetryPending = true;
      return;
    }
    const delay = delays[playbackRetryCount++];
    playbackRetryTimer = setTimeoutFn(() => {
      playbackRetryTimer = null;
      if (shouldMaintainPlayback() && !isPlaying()) void startMusic();
    }, delay);
  };
  const scheduleTrackEndGuard = () => {
    if (!shouldMaintainPlayback() || !isPlaying()) return;
    clearTrackEndGuard();
    const token = trackEndToken;
    const duration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
      ? Number(music.duration)
      : lastPlaybackDuration;
    const current = Math.max(0, Number(music.currentTime) || 0);
    const remainingMs = Number.isFinite(duration) && duration > 1
      ? Math.max(0, (duration - current) * 1000)
      : 750;
    const delay = Math.max(120, Math.min(remainingMs + 180, 30000));
    trackEndTimer = setTimeoutFn(() => {
      if (token !== trackEndToken) return;
      trackEndTimer = null;
      if (!shouldMaintainPlayback()) return;
      const actualDuration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
        ? Number(music.duration)
        : lastPlaybackDuration;
      const position = Math.max(0, Number(music.currentTime) || 0);
      const reachedEnd = music.ended || (music.paused && Number.isFinite(actualDuration) &&
        actualDuration > 1 && position >= actualDuration - 0.55);
      if (reachedEnd) {
        queueMusicEnded();
        return;
      }
      // Howler.js checks again in short intervals when the media node has not
      // actually reached its stop position yet instead of assuming the timer
      // alone means the track ended.
      if (!music.paused) scheduleTrackEndGuard();
    }, delay);
  };
  const scheduleMusicRetryAfterGesture = () => {
    playbackRetryPending = true;
    schedulePlaybackRetry();
    // Keep the ambience bed alive while the browser retries the main element.
    syncVinylSurfaceNoise();
  };
  const startMusic = () => {
    if (!shouldMaintainPlayback()) {
      if (!menuEntered) stopVinylSurfaceNoise();
      return Promise.resolve(false);
    }
    if (musicStartPromise) {
      // A lifecycle pause can arrive while play() is pending. Keep the resume
      // request instead of dropping it behind the single-flight lock.
      if (music.paused || music.ended) restartAfterStart = true;
      syncVinylSurfaceNoise();
      return musicStartPromise;
    }
    const run = async () => {
      const generation = playbackGeneration;
      clearTrackEndGuard();
      clearPlaybackRetry();
      if (music.ended) { try { music.currentTime = 0; } catch {} }
      const startPosition = Math.max(0, Number(music.currentTime) || 0);
      const needsStartFade = startPosition <= 0.35;
      stopMusicFade();
      musicFadeGain = needsStartFade ? 0 : 1;
      endFadeStarted = false;
      applyMusicVolume();
      try {
        await music.play();
        if (generation !== playbackGeneration) {
          // A record was replaced or playback was explicitly stopped while
          // play() was pending. Never let that stale request control the new source.
          music.pause();
          return false;
        }
        if (!shouldMaintainPlayback()) {
          music.pause();
          stopMusicFade();
          return false;
        }
        if (music.paused || music.ended) {
          scheduleMusicRetryAfterGesture();
          notify();
          return false;
        }
        playbackRetryCount = 0;
        playbackRetryPending = false;
        const actualPosition = Math.max(0, Number(music.currentTime) || 0);
        const elapsedBeforeFadeMs = needsStartFade
          ? Math.max(0, (actualPosition - startPosition) * 1000)
          : MUSIC_FADE_DURATION_MS;
        const remainingFadeMs = MUSIC_FADE_DURATION_MS - elapsedBeforeFadeMs;
        if (needsStartFade && remainingFadeMs > 0) {
          musicFadeGain = Math.max(0, Math.min(1, elapsedBeforeFadeMs / MUSIC_FADE_DURATION_MS));
          applyMusicVolume();
          animateMusicFade(1, remainingFadeMs);
        } else {
          musicFadeGain = 1;
          applyMusicVolume();
        }
        syncVinylSurfaceNoise();
        scheduleTrackEndGuard();
        notify();
        return true;
      } catch {
        if (generation !== playbackGeneration) return false;
        stopMusicFade();
        if (shouldMaintainPlayback()) scheduleMusicRetryAfterGesture();
        else stopVinylSurfaceNoise();
        notify();
        return false;
      }
    };
    const pending = run();
    musicStartPromise = pending;
    const finish = () => {
      if (musicStartPromise === pending) musicStartPromise = null;
      if (restartAfterStart) {
        restartAfterStart = false;
        clearPlaybackRetry();
        if (shouldMaintainPlayback() && !isPlaying()) {
          queueMicrotask(() => { if (shouldMaintainPlayback() && !isPlaying()) void startMusic(); });
        }
      }
    };
    pending.then(finish, finish);
    return pending;
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
    const stamp = now();
    if (stamp - lastCycleNotification < 900) return;
    lastCycleNotification = stamp;
    if (activeSourceReady && Number.isFinite(music.duration)) lastPlaybackDuration = music.duration;
    try { onPlaybackCycle({ track: selectedTrack, title: trackCatalog[selectedTrack].title }); } catch {}
    notify();
  };

  // Mirror two proven player patterns: Howler emits its end callback after the
  // media event stack has returned, and it verifies the node really reached its
  // stop position before advancing. This avoids calling play() re-entrantly
  // from Android WebView's native ended dispatch and provides a timer fallback.
  const queueMusicEnded = () => {
    if (!shouldMaintainPlayback() || endHandlingQueued) return;
    endHandlingQueued = true;
    clearTrackEndGuard();
    queueMicrotask(() => {
      endHandlingQueued = false;
      if (!shouldMaintainPlayback()) return;
      const duration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
        ? Number(music.duration)
        : lastPlaybackDuration;
      const position = Math.max(0, Number(music.currentTime) || 0);
      const reachedEnd = music.ended || (music.paused && Number.isFinite(duration) &&
        duration > 1 && position >= duration - 0.55);
      if (!reachedEnd) {
        scheduleTrackEndGuard();
        return;
      }
      stopMusicFade();
      musicFadeGain = 0;
      endFadeStarted = false;
      applyMusicVolume();
      try { music.currentTime = 0; } catch {}
      reportPlaybackCycle();
      playbackRetryCount = 0;
      playbackRetryPending = false;
      // startMusic() runs in a later microtask, after the browser has completed
      // dispatching pause/ended and committed the media element's ended state.
      queueMicrotask(() => { if (shouldMaintainPlayback()) void startMusic(); });
    });
  };
  const handleMusicEnded = () => queueMusicEnded();
  const recoverMissedMusicEnd = () => {
    if (!shouldMaintainPlayback()) return false;
    const duration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
      ? Number(music.duration)
      : lastPlaybackDuration;
    const currentTime = Math.max(0, Number(music.currentTime) || 0);
    const reachedEnd = music.ended || (music.paused && Number.isFinite(duration) &&
      duration > 1 && currentTime >= duration - 0.55);
    if (!reachedEnd) return false;
    queueMusicEnded();
    return true;
  };

  music.addEventListener?.("play", () => {
    lastPlaybackDuration = activeSourceReady && Number.isFinite(music.duration) ? music.duration : 0;
    syncVinylSurfaceNoise();
    scheduleTrackEndGuard();
    notify();
  });
  music.addEventListener?.("pause", () => {
    if (!shouldMaintainPlayback()) stopVinylSurfaceNoise();
    else {
      const duration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
        ? Number(music.duration)
        : lastPlaybackDuration;
      const current = Math.max(0, Number(music.currentTime) || 0);
      if (music.ended || (Number.isFinite(duration) && duration > 1 && current >= duration - 0.55)) {
        queueMusicEnded();
      } else if (!endFadeStarted) {
        // An OS/WebView interruption is not interpreted as a user pressing the turntable.
        scheduleMusicRetryAfterGesture();
      }
    }
    notify();
  });
  music.addEventListener?.("ended", handleMusicEnded);
  music.addEventListener?.("error", () => {
    stopMusicFade();
    clearTrackEndGuard();
    if (shouldMaintainPlayback()) scheduleMusicRetryAfterGesture();
    else stopVinylSurfaceNoise();
    notify();
  });
  music.addEventListener?.("emptied", stopVinylSurfaceNoise);
  music.addEventListener?.("loadedmetadata", () => {
    const duration = Number(music.duration);
    if (Number.isFinite(duration) && duration > 1) {
      activeSourceReady = true;
      lastPlaybackDuration = duration;
    }
    if (isPlaying()) scheduleTrackEndGuard();
  });
  music.addEventListener?.("durationchange", () => {
    const duration = Number(music.duration);
    if (Number.isFinite(duration) && duration > 1) {
      activeSourceReady = true;
      lastPlaybackDuration = duration;
    }
    if (isPlaying()) scheduleTrackEndGuard();
  });
  music.addEventListener?.("timeupdate", () => {
    // Media time keeps advancing in Floating Mode even when WebView intervals are throttled.
    musicFadeTick?.();
    const current = Number(music.currentTime) || 0;
    const actualDuration = activeSourceReady ? Number(music.duration) : NaN;
    const duration = Number.isFinite(actualDuration) && actualDuration > 0
      ? actualDuration
      : lastPlaybackDuration;
    if (Number.isFinite(duration) && duration > 1) {
      const remainingMs = Math.max(0, (duration - current) * 1000);
      const fadeWindowMs = Math.min(MUSIC_FADE_DURATION_MS + 250, Math.max(650, duration * 250));
      if (remainingMs <= fadeWindowMs && !endFadeStarted) {
        endFadeStarted = true;
        // Start against the current track's confirmed duration and finish with
        // a small media-boundary cushion, rather than racing the native loop.
        const fadeDurationMs = Math.max(1, Math.min(
          MUSIC_FADE_DURATION_MS,
          remainingMs - MUSIC_FADE_END_SAFETY_MS
        ));
        animateMusicFade(0, fadeDurationMs);
      }
      lastPlaybackDuration = duration;
      if (music.ended || (music.paused && current >= duration - 0.55)) queueMusicEnded();
    }
    if (trackEndTimer === null && isPlaying()) scheduleTrackEndGuard();
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
      lifecycleSuspended = false;
      resumeAfterSplash = false;
      if (!userPaused) void startMusic();
      return;
    }
    lifecycleSuspended = false;
    if (resumeAfterSplash && !userPaused) {
      resumeAfterSplash = false;
      void startMusic();
    } else {
      resumeAfterSplash = false;
    }
  }

  function pauseForSplash() {
    playbackGeneration += 1;
    restartAfterStart = false;
    floatingModeActive = false;
    backgroundRecoveryToken += 1;
    resumeAfterSplash = shouldMaintainPlayback() && !needleStarting;
    if (needleStarting) userPaused = true;
    lifecycleSuspended = true;
    clearTrackEndGuard();
    clearPlaybackRetry();
    playbackRetryPending = false;
    endHandlingQueued = false;
    cancelNeedleStart();
    stopMusicFade();
    musicFadeGain = 0;
    endFadeStarted = false;
    applyMusicVolume();
    stopVinylSurfaceNoise();
    music.pause();
    notify();
  }

  function resetSession() {
    playbackGeneration += 1;
    restartAfterStart = false;
    lifecycleSuspended = false;
    floatingModeActive = false;
    backgroundRecoveryToken += 1;
    menuEntered = false;
    clearTrackEndGuard();
    clearPlaybackRetry();
    playbackRetryPending = false;
    endHandlingQueued = false;
    cancelNeedleStart();
    stopMusicFade();
    musicFadeGain = 0;
    endFadeStarted = false;
    applyMusicVolume();
    stopVinylSurfaceNoise();
    music.pause();
    userPaused = false;
    resumeAfterSplash = false;
    notify();
  }

  function selectTrack(id) {
    if (!Object.hasOwn(trackCatalog, id) || id === selectedTrack) return false;
    playbackGeneration += 1;
    restartAfterStart = false;
    clearTrackEndGuard();
    clearPlaybackRetry();
    playbackRetryPending = false;
    endHandlingQueued = false;
    cancelNeedleStart();
    stopMusicFade();
    musicFadeGain = 0;
    endFadeStarted = false;
    applyMusicVolume();
    userPaused = true;
    stopVinylSurfaceNoise();
    music.pause();
    music.currentTime = 0;
    lastPlaybackDuration = 0;
    activeSourceReady = false;
    selectedTrack = id;
    music.src = trackCatalog[selectedTrack].src;
    music.loop = false;
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
      playbackGeneration += 1;
      restartAfterStart = false;
      cancelNeedleStart();
      userPaused = true;
      clearTrackEndGuard();
      clearPlaybackRetry();
      playbackRetryPending = false;
      endHandlingQueued = false;
      stopMusicFade();
      musicFadeGain = 0;
      endFadeStarted = false;
      applyMusicVolume();
      stopVinylSurfaceNoise();
      music.pause();
      notify();
      return Promise.resolve(false);
    }
    return lowerNeedleAndPlay();
  }

  function setMusicVolume(value) {
    musicVolume = clampVolume(value);
    applyMusicVolume();
    write("mp-audio-music-volume", musicVolume);
    notify();
  }

  function setEffectsVolume(value) {
    effectsVolume = clampVolume(value);
    write("mp-audio-effects-volume", effectsVolume);
    syncVinylSurfaceNoise();
    notify();
  }

  function setFloatingMode(active) {
    floatingModeActive = active === true;
    backgroundRecoveryToken += 1;
    if (!floatingModeActive || !menuEntered || userPaused) return Promise.resolve(false);
    music.loop = false;
    recoverMissedMusicEnd();
    if (music.paused || music.ended) return startMusic();
    // Do not cancel a fade-out at the end or the following fade-in just because
    // the Activity's visual engine is suspended behind the floating bubble.
    if (endFadeStarted || musicFadeTimer !== null) {
      syncVinylSurfaceNoise();
      return Promise.resolve(true);
    }
    if (musicFadeGain < 1) animateMusicFade(1, MUSIC_FADE_DURATION_MS);
    syncVinylSurfaceNoise();
    return Promise.resolve(true);
  }

  function recoverAfterBackgroundTransition() {
    if (!floatingModeActive || !shouldMaintainPlayback()) return false;
    const token = ++backgroundRecoveryToken;
    const verifyPlayback = () => {
      if (token !== backgroundRecoveryToken ||
          !floatingModeActive ||
          !shouldMaintainPlayback()) return;
      // Android may pause a freshly loaded WebView media source while moving
      // the Activity behind the bubble. Re-check after the native transition
      // instead of waiting for a foreground/focus event to restart it.
      // Resolve an ended or boundary-paused track before generic resume.
      // Otherwise startMusic() may try to resume a manually selected record
      // from its duration endpoint while the ended-event microtask is pending.
      if (recoverMissedMusicEnd()) return;
      if (endHandlingQueued) return;
      if (music.paused || music.ended) {
        playbackRetryCount = 0;
        playbackRetryPending = false;
        clearPlaybackRetry();
        void startMusic();
        return;
      }
      syncVinylSurfaceNoise();
    };
    verifyPlayback();
    [180, 520, 1100, 1900].forEach(delay => setTimeoutFn(verifyPlayback, delay));
    return true;
  }

  function retryPendingPlayback() {
    if (!shouldMaintainPlayback()) return false;
    if (!playbackRetryPending && !music.paused && !music.ended && !vinylSurfaceNoise.paused) return false;
    clearPlaybackRetry();
    playbackRetryCount = 0;
    playbackRetryPending = false;
    syncVinylSurfaceNoise();
    if (music.paused || music.ended) void startMusic();
    return true;
  }

  function recoverAfterInterruption() {
    if (!shouldMaintainPlayback()) return false;
    syncVinylSurfaceNoise();
    if (recoverMissedMusicEnd()) return true;
    if (endHandlingQueued) return true;
    const duration = activeSourceReady && Number.isFinite(Number(music.duration)) && Number(music.duration) > 1
      ? Number(music.duration) : lastPlaybackDuration;
    const current = Math.max(0, Number(music.currentTime) || 0);
    if (music.ended || (music.paused && Number.isFinite(duration) && duration > 1 && current >= duration - 0.55)) {
      queueMusicEnded();
      return true;
    }
    if (music.paused) {
      playbackRetryCount = 0;
      playbackRetryPending = false;
      clearPlaybackRetry();
      void startMusic();
    }
    return true;
  }

  function updateCustomTracks(entries) {
    trackCatalog = { ...TRACKS };
    normalizeCustomTracks(entries);
    if (!Object.hasOwn(trackCatalog, selectedTrack)) {
      const resumeBuiltIn = menuEntered && isPlaying() && !userPaused;
      stopMusicFade();
      musicFadeGain = 0;
      endFadeStarted = false;
      applyMusicVolume();
      stopVinylSurfaceNoise();
      music.pause();
      selectedTrack = "happy";
      music.currentTime = 0;
      lastPlaybackDuration = 0;
      activeSourceReady = false;
      music.src = trackCatalog.happy.src;
      music.loop = false;
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
      extension: track.extension || "ogg",
      mimeType: track.mimeType || "audio/ogg",
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
    setEffectsVolume,
    setFloatingMode,
    retryPendingPlayback,
    recoverAfterInterruption,
    recoverAfterBackgroundTransition
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
  let suspended = false;

  const schedule = () => {
    if (disposed || suspended || frameId !== null || (targetSpeed === 0 && speed === 0)) return;
    lastTime = null;
    frameId = requestFrame(tick);
  };

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
    schedule();
  }

  function setSuspended(value) {
    if (disposed) return;
    const next = value === true;
    if (suspended === next) return;
    suspended = next;
    if (suspended) {
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      lastTime = null;
      return;
    }
    schedule();
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
    setSuspended,
    dispose,
    getState: () => ({ angle, speed, targetSpeed, running: frameId !== null, suspended, disposed })
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
