import test from "node:test";
import assert from "node:assert/strict";
import { createPocketAudioController } from "../web/src/audio-player.js";

class FakeAudio {
  static instances = [];
  constructor(src = "") {
    this.src = src;
    this.paused = true;
    this.ended = false;
    this.loop = false;
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
  pause() { this.paused = true; this.dispatch("pause"); }
  load() { this.ended = false; }
}

function harness(values = {}) {
  FakeAudio.instances = [];
  const data = new Map(Object.entries(values));
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const audio = createPocketAudioController({ AudioCtor: FakeAudio, storage });
  return { audio, data };
}

test("background music stays silent until the main menu is entered", () => {
  const { audio } = harness();
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(FakeAudio.instances[0].paused, true);
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
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
