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
  onChange = () => {}
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

  let selectedTrack = read("mp-audio-track", "happy");
  if (!Object.hasOwn(TRACKS, selectedTrack)) selectedTrack = "happy";
  let musicVolume = clampVolume(read("mp-audio-music-volume", 68));
  let effectsVolume = clampVolume(read("mp-audio-effects-volume", 76));
  let menuEntered = false;
  let userPaused = false;
  let resumeAfterSplash = false;
  let needleStarting = false;
  let needleToken = 0;
  let activeNeedleEffect = null;

  const music = new AudioCtor(TRACKS[selectedTrack].src);
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

  music.addEventListener?.("play", notify);
  music.addEventListener?.("pause", notify);
  music.addEventListener?.("ended", notify);
  music.addEventListener?.("error", notify);

  function getState() {
    return {
      track: selectedTrack,
      title: TRACKS[selectedTrack].title,
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
    resumeAfterSplash = isPlaying() || needleStarting;
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
    if (!Object.hasOwn(TRACKS, id) || id === selectedTrack) return false;
    cancelNeedleStart();
    music.pause();
    music.currentTime = 0;
    selectedTrack = id;
    userPaused = true;
    music.src = TRACKS[selectedTrack].src;
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

  return {
    getState,
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
