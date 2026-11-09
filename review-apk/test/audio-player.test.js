import test from "node:test";
import assert from "node:assert/strict";
import { createPocketAudioController, createTurntableMotion, createVinylDesignController, getSupportedAudioPlaybackTypes, VINYL_STYLES, VINYL_SURFACE_NOISE_SRC } from "../web/src/audio-player.js";

class FakeAudio {
  static instances = [];
  constructor(src = "") {
    this.src = src;
    this.paused = true;
    this.ended = false;
    this.loop = false;
    this.currentTime = 0;
    this.duration = 100;
    this.volume = 1;
    this.listeners = new Map();
    FakeAudio.instances.push(this);
  }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  dispatch(name) { for (const callback of [...(this.listeners.get(name) || [])]) callback(); }
  play() {
    this.paused = false;
    this.dispatch("play");
    if (this.src.includes("needle%20drop")) {
      queueMicrotask(() => {
        this.paused = true;
        this.ended = true;
        this.dispatch("ended");
      });
    }
    return Promise.resolve();
  }
  pause() {
    // HTMLMediaElement.pause() is idempotent and need not emit another pause event.
    if (this.paused) return;
    this.paused = true;
    this.dispatch("pause");
  }
  load() { this.ended = false; }
}

function harness(values = {}, callbacks = {}) {
  FakeAudio.instances = [];
  const data = new Map(Object.entries(values));
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const audio = createPocketAudioController({ AudioCtor: FakeAudio, storage, ...callbacks });
  return { audio, data };
}

test("background music stays silent until the main menu is entered", () => {
  const { audio } = harness();
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(FakeAudio.instances[0].paused, true);
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
});

test("vinyl surface noise loops for the full music playback and stops with music", () => {
  const { audio } = harness();
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  assert.ok(noise, "the dedicated vinyl surface-noise layer should be created");
  assert.equal(noise.loop, true);
  assert.equal(noise.paused, true);

  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
  assert.equal(noise.paused, false);
  assert.ok(noise.volume > 0 && noise.volume < 0.2, "surface noise should stay beneath the music");

  audio.pauseForSplash();
  assert.equal(noise.paused, true);
  assert.equal(noise.currentTime, 0);

  audio.enterMainMenu();
  assert.equal(noise.paused, false);
  audio.resetSession();
  assert.equal(noise.paused, true);
});

test("vinyl surface noise follows the effects slider without altering other sound effects", () => {
  const { audio } = harness();
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  audio.enterMainMenu();
  assert.equal(noise.paused, false);

  audio.setEffectsVolume(0);
  assert.equal(noise.paused, true);
  audio.setEffectsVolume(35);
  assert.equal(noise.paused, false);
  assert.equal(noise.volume, 0.35 * 0.16);

  audio.selectTrack("chill");
  assert.equal(noise.paused, true, "placing a different record must not restart ambience");
});

test("music pauses during splash and resumes only after the main menu returns", () => {
  const { audio } = harness();
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
  audio.pauseForSplash();
  assert.equal(audio.getState().isPlaying, false);
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
});

test("placing another record changes track but never starts playback", () => {
  const { audio } = harness();
  audio.enterMainMenu();
  assert.equal(audio.selectTrack("chill"), true);
  assert.equal(audio.getState().track, "chill");
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(audio.getState().title, "chill-1a");
});

test("needle must be lowered before a newly selected track starts", async () => {
  const { audio } = harness();
  audio.enterMainMenu();
  audio.selectTrack("chill");
  assert.equal(audio.getState().isPlaying, false);
  await audio.toggleNeedle();
  assert.equal(audio.getState().isPlaying, true);
});

test("music and effects volume values persist independently", () => {
  const { audio, data } = harness();
  audio.setMusicVolume(42);
  audio.setEffectsVolume(23);
  assert.equal(data.get("mp-audio-music-volume"), "42");
  assert.equal(data.get("mp-audio-effects-volume"), "23");
  assert.equal(audio.getState().musicVolume, 42);
  assert.equal(audio.getState().effectsVolume, 23);
});



test("custom tracks preserve the actual imported audio extension and MIME type", () => {
  const id = "01234567-89ab-cdef-0123-456789abcdef";
  const { audio } = harness({}, {
    customTracks: [{ id, title: "Local MP3", extension: "mp3", mimeType: "audio/mpeg", playbackType: "audio/mpeg" }]
  });
  const track = audio.getTracks().find(item => item.id === id);
  assert.equal(track.extension, "mp3");
  assert.equal(track.mimeType, "audio/mpeg");
  assert.equal(audio.selectTrack(id), true);
  assert.match(FakeAudio.instances[0].src, /01234567-89ab-cdef-0123-456789abcdef\.mp3$/);
});

test("older custom music records without extension metadata remain readable as OGG", () => {
  const id = "abcdef01-2345-6789-abcd-ef0123456789";
  const { audio } = harness({}, {
    customTracks: [{ id, title: "Older Pocket Record" }]
  });
  const track = audio.getTracks().find(item => item.id === id);
  assert.equal(track.extension, "ogg");
  assert.equal(track.mimeType, "audio/ogg");
  assert.equal(audio.selectTrack(id), true);
  assert.match(FakeAudio.instances[0].src, /\.ogg$/);
});

test("the picker profile contains only WebView audio types that canPlayType reports", () => {
  const supported = getSupportedAudioPlaybackTypes({
    canPlayType: type => type === "audio/mpeg" || type.startsWith("audio/ogg") ? "probably" : ""
  });
  assert.deepEqual(supported, [
    'audio/ogg; codecs="vorbis"',
    'audio/ogg; codecs="opus"',
    "audio/mpeg"
  ]);
});

function makeMotionHarness() {
  let nextId = 0;
  const queue = new Map();
  const motion = createTurntableMotion({
    requestFrame: callback => {
      const id = ++nextId;
      queue.set(id, callback);
      return id;
    },
    cancelFrame: id => queue.delete(id)
  });
  return {
    motion,
    tick(time) {
      const next = queue.entries().next().value;
      assert.ok(next, "an animation frame should be queued");
      const [id, callback] = next;
      queue.delete(id);
      callback(time);
    },
    pending: () => queue.size
  };
}

test("turntable accelerates smoothly toward 33⅓ RPM", () => {
  const h = makeMotionHarness();
  h.motion.setPlaying(true);
  assert.equal(h.motion.getState().targetSpeed, 200);
  h.tick(0);
  for (let time = 16; time <= 512; time += 16) h.tick(time);
  const midRampSpeed = h.motion.getState().speed;
  assert.ok(midRampSpeed > 100 && midRampSpeed < 200);
  for (let time = 528; time <= 3200; time += 16) h.tick(time);
  assert.ok(h.motion.getState().speed > 195);
  assert.ok(h.motion.getState().angle > 0);
  h.motion.dispose();
  assert.equal(h.pending(), 0);
  assert.equal(h.motion.getState().disposed, true);
});

test("turntable eases down instead of stopping abruptly", () => {
  const h = makeMotionHarness();
  h.motion.setPlaying(true);
  h.tick(0);
  for (let time = 16; time <= 3200; time += 16) h.tick(time);
  const runningSpeed = h.motion.getState().speed;
  assert.ok(runningSpeed > 195);
  h.motion.setPlaying(false);
  assert.equal(h.motion.getState().targetSpeed, 0);
  h.tick(3216);
  assert.ok(h.motion.getState().speed < runningSpeed);
  assert.ok(h.motion.getState().speed > 0);
  for (let time = 3232; time <= 6200 && h.pending() > 0; time += 16) h.tick(time);
  assert.equal(h.motion.getState().speed, 0);
  assert.equal(h.pending(), 0);
  h.motion.dispose();
});

test("turntable motion can be disposed when Settings is left", () => {
  const h = makeMotionHarness();
  h.motion.setPlaying(true);
  assert.equal(h.motion.getState().running, true);
  h.motion.dispose();
  assert.equal(h.motion.getState().running, false);
  assert.equal(h.pending(), 0);
});

test("lifting the needle during the crackle cancels the pending music start", async () => {
  const { audio } = harness();
  audio.enterMainMenu();
  audio.selectTrack("chill");
  const start = audio.toggleNeedle();
  assert.equal(audio.getState().isStarting, true);
  audio.pauseForSplash();
  await start;
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(audio.getState().isStarting, false);
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, false);
});


test("vinyl art rotates when a looping music track completes a full cycle", () => {
  let cycles = 0;
  const { audio } = harness({}, { onPlaybackCycle: () => { cycles += 1; } });
  audio.enterMainMenu();
  const music = FakeAudio.instances[0];
  music.currentTime = 99.2;
  music.dispatch("timeupdate");
  music.currentTime = 0.15;
  music.dispatch("timeupdate");
  assert.equal(cycles, 1);
});

test("all twenty vinyl label designs are available and manually selectable", () => {
  assert.equal(VINYL_STYLES.length, 20);
  const data = new Map();
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const design = createVinylDesignController({ storage, random: () => 0 });
  assert.equal(design.getState().id, "r01");
  assert.equal(design.choose("r20"), true);
  assert.equal(design.getState().id, "r20");
  assert.equal(design.getState().mode, "manual");
  assert.equal(data.get("mp-vinyl-style"), "r20");
  assert.equal(data.get("mp-vinyl-style-mode"), "manual");
});

test("season-start design changes once for each distinct season key", () => {
  const data = new Map();
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const design = createVinylDesignController({ storage, random: () => 0 });
  const before = design.getState().id;
  assert.equal(design.onSeasonStart("year-1-spring"), true);
  const after = design.getState().id;
  assert.notEqual(after, before);
  assert.equal(design.getState().reason, "season-start");
  assert.equal(design.onSeasonStart("year-1-spring"), false);
  assert.equal(design.getState().id, after);
});

test("a manual style returns to automatic random rotation after a track cycle", () => {
  const data = new Map();
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const design = createVinylDesignController({ storage, random: () => 0 });
  design.choose("r20");
  design.rotateRandom("track-end");
  assert.equal(design.getState().mode, "auto");
  assert.notEqual(design.getState().id, "r20");
  assert.equal(design.getState().reason, "track-end");
});

test("vinyl ambience stops explicitly even when the music element is already paused", () => {
  const { audio } = harness();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  audio.enterMainMenu();
  assert.equal(noise.paused, false);

  // Simulate a WebView pause that happened before the controller receives its pause event.
  music.paused = true;
  noise.currentTime = 17;
  assert.equal(audio.selectTrack("chill"), true);
  assert.equal(noise.paused, true);
  assert.equal(noise.currentTime, 0);

  // Reset and splash paths must not depend on a second music pause event either.
  audio.enterMainMenu();
  music.paused = true;
  noise.paused = false;
  noise.currentTime = 9;
  audio.pauseForSplash();
  assert.equal(noise.paused, true);
  assert.equal(noise.currentTime, 0);

  noise.paused = false;
  noise.currentTime = 6;
  audio.resetSession();
  assert.equal(noise.paused, true);
  assert.equal(noise.currentTime, 0);
});
