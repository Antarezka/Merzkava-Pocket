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
    this.playCount = 0;
    this.inEndedDispatch = false;
    this.playAttemptedInsideEnded = 0;
    this.failNextPlay = false;
    FakeAudio.instances.push(this);
  }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
  }
  removeEventListener(name, callback) { this.listeners.get(name)?.delete(callback); }
  dispatch(name) { for (const callback of [...(this.listeners.get(name) || [])]) callback(); }
  play() {
    this.playCount += 1;
    if (this.inEndedDispatch) {
      this.playAttemptedInsideEnded += 1;
      return Promise.reject(new Error("play() was called before ended dispatch completed"));
    }
    if (this.failNextPlay) {
      this.failNextPlay = false;
      return Promise.reject(new Error("simulated transient media play failure"));
    }
    this.paused = false;
    this.ended = false;
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
  finish() {
    this.currentTime = this.duration;
    this.ended = true;
    this.paused = true;
    this.dispatch("pause");
    this.inEndedDispatch = true;
    this.dispatch("ended");
    this.inEndedDispatch = false;
  }
  finishWithoutEndedEvent() {
    this.currentTime = this.duration;
    this.ended = false;
    this.paused = true;
    this.dispatch("pause");
  }
  wrapToStart() {
    this.currentTime = 0.1;
    this.dispatch("timeupdate");
  }
}

async function flushAudioMicrotasks() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

function harness(values = {}, callbacks = {}) {
  FakeAudio.instances = [];
  const data = new Map(Object.entries(values));
  const storage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  };
  const {
    setTimeoutFn = () => 0,
    clearTimeoutFn = () => {},
    ...controllerOptions
  } = callbacks;
  const audio = createPocketAudioController({
    AudioCtor: FakeAudio, storage, setTimeoutFn, clearTimeoutFn, ...controllerOptions
  });
  return { audio, data };
}

test("the two new built-in BGM records use the approved Retroatrical names", () => {
  const { audio } = harness();
  const titles = audio.getTracks().map(track => track.title);
  assert.ok(titles.includes("Retroatrical-1"));
  assert.ok(titles.includes("Retroatrical-2"));
  assert.equal(titles.includes("Retroatrical-a1"), false);
});

test("background music stays silent until the main menu is entered", () => {
  const { audio } = harness();
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(FakeAudio.instances[0].paused, true);
  audio.enterMainMenu();
  assert.equal(audio.getState().isPlaying, true);
});

test("vinyl surface noise loops for the full music playback and stops with music", async () => {
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
  await flushAudioMicrotasks();
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
  await flushAudioMicrotasks();
  assert.equal(audio.getState().isPlaying, true);
});

test("placing another record changes track but never starts playback", () => {
  const { audio } = harness();
  audio.enterMainMenu();
  assert.equal(audio.selectTrack("chill"), true);
  assert.equal(audio.getState().track, "chill");
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(audio.getState().title, "chill-1a");
  assert.equal(FakeAudio.instances[0].loop, false);
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

test("bubble mode suspends turntable drawing while BGM and vinyl noise keep playing", () => {
  const { audio } = harness();
  audio.enterMainMenu();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  assert.equal(music.paused, false);
  assert.equal(noise.paused, false);

  const h = makeMotionHarness();
  h.motion.setPlaying(true);
  h.tick(0);
  h.tick(16);
  assert.ok(h.pending() > 0);

  h.motion.setSuspended(true);
  assert.equal(h.pending(), 0);
  assert.equal(h.motion.getState().suspended, true);
  assert.equal(music.paused, false);
  assert.equal(noise.paused, false);

  h.motion.setPlaying(audio.getState().isPlaying);
  assert.equal(h.pending(), 0, "turntable drawing remains suspended while bubble mode is active");
  h.motion.setSuspended(false);
  assert.equal(h.motion.getState().suspended, false);
  assert.equal(h.pending(), 1, "turntable drawing resumes when Pocket is visible again");
  assert.equal(music.paused, false);
  assert.equal(noise.paused, false);
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


test("end fade completes and the ended event replays with fade-in in Floating Mode",async()=>{
  const clock=makeAudioFadeClock();
  let cycles=0;
  const {audio}=harness({}, {
    now:clock.now,setIntervalFn:clock.setInterval,clearIntervalFn:clock.clearInterval,
    onPlaybackCycle:()=>{cycles+=1;}
  });
  audio.enterMainMenu();
  const music=FakeAudio.instances[0];
  const noise=FakeAudio.instances.find(item=>item.src===VINYL_SURFACE_NOISE_SRC);
  assert.equal(music.loop,false);
  assert.equal(music.playCount,1);
  await Promise.resolve();
  clock.advance(2200);
  assert.ok(Math.abs(music.volume-.68)<.001,"initial fade-in completes");
  await audio.setFloatingMode(true);

  music.currentTime=98;
  music.dispatch("timeupdate");
  assert.ok(Math.abs(music.volume-.68)<.001,"fade-out starts at the end window");
  clock.advance(900);
  assert.ok(music.volume>0&&music.volume<.68,"the end fade progresses while floating");
  music.dispatch("timeupdate");
  clock.advance(1076);
  assert.equal(music.volume,0,"fade-out reaches silence before the track boundary");

  music.finish();
  await flushAudioMicrotasks();
  assert.equal(cycles,1);
  assert.equal(music.currentTime,0);
  assert.equal(music.paused,false);
  assert.equal(music.playCount,2,"the ended event explicitly starts the next playback cycle");
  assert.equal(music.volume,0,"the new track cycle begins at silence");
  assert.equal(noise.paused,false,"vinyl surface noise stays continuous");
  clock.advance(1100);
  assert.ok(music.volume>0&&music.volume<.68,"fade-in restarts after the ended event");
  clock.advance(1100);
  assert.ok(Math.abs(music.volume-.68)<.001);
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


function makeAudioFadeClock() {
  let time = 0;
  let nextId = 0;
  const intervals = new Map();
  return {
    now: () => time,
    setInterval: callback => {
      const id = ++nextId;
      intervals.set(id, callback);
      return id;
    },
    clearInterval: id => intervals.delete(id),
    advance(milliseconds) {
      time += milliseconds;
      for (const callback of [...intervals.values()]) callback();
    },
    pending: () => intervals.size
  };
}

test("native looping keeps one playback session, fades into the next cycle, and leaves vinyl noise running", async () => {
  const clock = makeAudioFadeClock();
  let cycles = 0;
  const { audio } = harness({}, {
    now: clock.now,
    setIntervalFn: clock.setInterval,
    clearIntervalFn: clock.clearInterval,
    onPlaybackCycle: () => { cycles += 1; }
  });
  audio.enterMainMenu();
  await flushAudioMicrotasks();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  assert.equal(music.loop, true);
  assert.equal(music.playCount, 1);
  clock.advance(2200);
  music.currentTime = 98;
  music.dispatch("timeupdate");
  clock.advance(2200);
  assert.equal(music.volume, 0, "the outgoing native loop fades all the way down");
  music.wrapToStart();
  assert.equal(cycles, 1, "the loop boundary rotates the vinyl design once");
  assert.equal(music.playCount, 1, "the media engine continues the same playback session");
  assert.equal(music.paused, false);
  assert.equal(noise.paused, false, "the ambience track is not stopped or restarted at the loop boundary");
  clock.advance(1100);
  assert.ok(music.volume > 0 && music.volume < 0.68);
  clock.advance(1100);
  assert.ok(Math.abs(music.volume - 0.68) < 0.001);
});

test("ended event explicitly replays a completed Pocket music track",async()=>{
  const {audio}=harness();
  audio.enterMainMenu();
  await Promise.resolve();
  const music=FakeAudio.instances[0];
  const noise=FakeAudio.instances.find(item=>item.src===VINYL_SURFACE_NOISE_SRC);
  assert.equal(music.loop,false);
  assert.equal(music.playCount,1);
  music.finish();
  await flushAudioMicrotasks();
  assert.equal(music.paused,false);
  assert.equal(music.ended,false);
  assert.equal(music.currentTime,0);
  assert.equal(music.playCount,2,"explicit replay is reserved for the failed-native-loop fallback");
  assert.equal(noise.paused,false,"vinyl ambience continues across the fallback restart");
});

test("end recovery also works when WebView pauses at duration but omits the ended event", async () => {
  const { audio } = harness();
  audio.enterMainMenu();
  await Promise.resolve();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  music.finishWithoutEndedEvent();
  await flushAudioMicrotasks();
  assert.equal(music.paused, false, "the duration guard should start the next cycle");
  assert.equal(music.currentTime, 0);
  assert.equal(music.playCount, 2);
  assert.equal(noise.paused, false, "vinyl ambience must stay alive during missed-ended recovery");
});

test("a transient play rejection does not kill vinyl ambience and can recover after a user gesture", async () => {
  const { audio } = harness();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  music.failNextPlay = true;
  audio.enterMainMenu();
  await flushAudioMicrotasks();
  assert.equal(audio.getState().isPlaying, false);
  assert.equal(noise.paused, false, "a failed music restart must not stop the independent ambience layer");
  assert.equal(audio.retryPendingPlayback(), true);
  await flushAudioMicrotasks();
  assert.equal(audio.getState().isPlaying, true);
  assert.equal(noise.paused, false);
});

test("BGM fades out at track end and fades back in after the ended event", async () => {
  const clock = makeAudioFadeClock();
  let cycles = 0;
  const { audio } = harness({}, {
    now: clock.now,
    setIntervalFn: clock.setInterval,
    clearIntervalFn: clock.clearInterval,
    onPlaybackCycle: () => { cycles += 1; }
  });
  audio.enterMainMenu();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  assert.equal(music.loop, true);
  assert.equal(music.volume, 0);
  await Promise.resolve();

  clock.advance(1100);
  assert.ok(music.volume > 0 && music.volume < 0.68);
  clock.advance(1100);
  assert.ok(Math.abs(music.volume - 0.68) < 0.001);

  music.currentTime = 98;
  music.dispatch("timeupdate");
  clock.advance(1100);
  assert.ok(music.volume > 0 && music.volume < 0.68);
  clock.advance(876);
  assert.equal(music.volume, 0, "fade-out must finish just before the native loop");

  // The final fade reaches silence, then the ended event explicitly starts the next cycle.
  music.finish();
  await flushAudioMicrotasks();
  assert.equal(cycles,1);
  assert.equal(music.currentTime,0);
  assert.equal(music.paused,false);
  assert.equal(music.volume,0);
  assert.equal(music.playCount,2,"the ended event explicitly starts the next cycle");
  assert.equal(music.playAttemptedInsideEnded,0,"play() must wait until the native ended dispatch is complete");
  assert.equal(noise.paused,false,"vinyl noise remains uninterrupted between BGM cycles");

  clock.advance(1100);
  assert.ok(music.volume > 0 && music.volume < 0.68);
  clock.advance(1100);
  assert.ok(Math.abs(music.volume - 0.68) < 0.001);
});
test("manually pausing during the end fade cancels its timer and stops only the vinyl ambience bed", async () => {
  const clock = makeAudioFadeClock();
  const { audio } = harness({}, {
    now: clock.now,
    setIntervalFn: clock.setInterval,
    clearIntervalFn: clock.clearInterval
  });
  audio.enterMainMenu();
  const music = FakeAudio.instances[0];
  const noise = FakeAudio.instances.find(item => item.src === VINYL_SURFACE_NOISE_SRC);
  await Promise.resolve();
  clock.advance(2200);
  music.currentTime = 99;
  music.dispatch("timeupdate");
  assert.equal(clock.pending(), 1);

  await audio.toggleNeedle();
  assert.equal(music.paused, true);
  assert.equal(music.volume, 0);
  assert.equal(noise.paused, true);
  assert.equal(clock.pending(), 0);
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

