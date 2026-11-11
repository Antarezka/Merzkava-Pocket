import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const audioVisualSource = readFileSync(new URL("../web/src/audio-player.js", import.meta.url), "utf8");
const deckSource = readFileSync(new URL("../web/src/pocket-audio-director.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketCriAudioRuntime.java", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketNativeBridge.java", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketUpdateWorker.java", import.meta.url), "utf8");
const nativeSource = readFileSync(new URL("../app/src/main/cpp/cri_audio_jni.cpp", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../web/src/styles.css", import.meta.url), "utf8");
const activitySource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/MainActivity.java", import.meta.url), "utf8");
const floatingSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketFloatingWindow.java", import.meta.url), "utf8");

test("Settings mounts and disposes the vinyl deck controls", () => {
  const start = source.indexOf('if(destination==="settings"){');
  const end = source.indexOf('if(destination==="economy"){', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = source.slice(start, end);
  assert.match(route, /const audioCleanup\s*=\s*mountAudioSettings\(\);/);
  assert.match(route, /audioCleanup\?\.\(\)/);
});

test("Audio UI controls are presentation and user-intent adapters only", () => {
  const start = source.indexOf("function mountAudioSettings()");
  const end = source.indexOf("function paperLightControlMarkup()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const mount = source.slice(start, end);
  assert.match(mount, /toggle\.addEventListener\("click"/);
  assert.match(mount, /recordList\?\.addEventListener\("click"/);
  assert.ok(mount.includes('section.querySelector("[data-audio-needle]").addEventListener("click"'));
  assert.ok(mount.includes('section.querySelector("[data-music-volume]").addEventListener("input"'));
  assert.ok(mount.includes('section.querySelector("[data-effects-volume]").addEventListener("input"'));
  assert.ok(mount.includes('section.querySelector("[data-ambience-volume]").addEventListener("input"'));
  assert.doesNotMatch(mount, /AudioContext|new Audio\s*\(|\.play\(\)/);
});

test("Only CRI owns playback; the web layer has no parallel audio engine", () => {
  assert.match(source, /import \{ createPocketAudioDirector \} from "\.\/pocket-audio-director\.js"/);
  assert.match(source, /audioDirector\.startStartupSequence\(\)/);
  assert.doesNotMatch(source, /audioDirector\.startAutomatically\(\)/);
  const splash = source.slice(source.indexOf("function showSplash()"), source.indexOf("function renderHome()"));
  assert.ok(splash.indexOf("audioDirector.startStartupSequence()") < splash.indexOf("renderHome()"),
    "startup playback must be requested only after the authenticated splash animation completes");
  assert.match(source, /state\.ambienceStatus === "error"/);
  assert.doesNotMatch(source, /createPocketAudioController|playPocketAudio|startPocketAmbience|setPocketAudioVolume/);
  assert.doesNotMatch(audioVisualSource, /AudioContext|webkitAudioContext|new Audio\s*\(|createElement\s*\(\s*["']audio/);
  assert.match(deckSource, /native\.criPlayTrack\(selectedTrack\)/);
  assert.match(deckSource, /native\?\.criPauseMusic/);
  assert.match(bridgeSource, /criPlayTrack/);
  assert.match(bridgeSource, /criPauseMusic/);
  assert.match(bridgeSource, /criPlayEffect/);
  assert.doesNotMatch(bridgeSource, /playPocketAudio|startPocketAmbience|playPocketSound|pausePocketAudio|setPocketAudioVolume/);
});

test("Selecting a record while idle only selects it; active playback changes use CRI", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?director-test");
  const calls = [];
  const native = {
    criPlayTrack(id) { calls.push(["play", id]); return true; },
    criPlayAmbience() { calls.push(["ambience"]); return true; },
    criPauseMusic(paused) { calls.push(["pause", paused]); return true; },
    criPlayEffect(id) { calls.push(["effect", id]); return true; },
    criSetVolume(channel, value) { calls.push(["volume", channel, value]); },
    criStopMusic() { calls.push(["stop"]); return true; }
  };
  const deck = createPocketAudioDirector({ native });
  assert.deepEqual(calls.slice(0, 3), [
    ["volume", "music", 68],
    ["volume", "ambience", 34],
    ["volume", "effects", 76]
  ]);
  calls.length = 0;
  assert.equal(deck.selectTrack("chill"), true);
  assert.equal(calls.length, 0, "placing a record while idle must not start playback");
  assert.equal(deck.startStartupSequence(), true);
  assert.deepEqual(calls, [["effect", "record-placement"]],
    "startup begins with the record-placement cue instead of BGM");
  deck.updateNativeState("record", "playing");
  assert.equal(calls.length, 1, "BGM must wait while the CRI record-placement cue is playing");
  deck.updateNativeState("record", "ended");
  assert.deepEqual(calls[1], ["play", "chill"], "BGM starts after the record-placement cue ends");
  assert.equal(deck.getState().needleDown, true);
  deck.updateNativeState("music", "playing");
  assert.deepEqual(calls[2], ["ambience"], "Director starts crackle only after CRI confirms BGM playback");
  assert.equal(deck.selectTrack("retroatrical1"), true);
  assert.deepEqual(calls[3], ["play", "retroatrical1"], "BGM replacement leaves ambience running");
  deck.updateNativeState("music", "paused");
  deck.toggleNeedle();
  assert.deepEqual(calls.slice(4, 6), [["effect", "stylus-drop"], ["pause", false]]);
  deck.updateNativeState("music", "playing");
  deck.toggleNeedle();
  assert.deepEqual(calls[6], ["pause", true]);
  deck.setMusicVolume(52);
  deck.setEffectsVolume(41);
  deck.setAmbienceVolume(28);
  deck.playEffect("record-placement");
  deck.stop();
  assert.deepEqual(calls.slice(7), [
    ["volume", "music", 52],
    ["volume", "effects", 41],
    ["volume", "ambience", 28],
    ["effect", "record-placement"],
    ["stop"]
  ]);
});

test("CRI has separate, simultaneous channels for music, crackle, stylus and record placement", () => {
  assert.match(runtimeSource, /CHANNEL_MUSIC\s*=\s*0/);
  assert.match(runtimeSource, /CHANNEL_VINYL_CRACKLE\s*=\s*1/);
  assert.match(runtimeSource, /CHANNEL_STYLUS\s*=\s*2/);
  assert.match(runtimeSource, /CHANNEL_RECORD\s*=\s*3/);
  assert.match(runtimeSource, /BUILT_IN\.put\("vinyl-crackle", "vinyl-surface-noise\.adx"\)/);
  assert.match(runtimeSource, /BUILT_IN\.put\("stylus-drop", "needle-drop\.adx"\)/);
  assert.match(runtimeSource, /BUILT_IN\.put\("record-placement", "record-placement\.adx"\)/);
  const musicStart = runtimeSource.indexOf("public boolean playTrack(");
  const ambienceStart = runtimeSource.indexOf("public boolean playAmbience(", musicStart);
  assert.ok(musicStart >= 0 && ambienceStart > musicStart);
  assert.doesNotMatch(runtimeSource.slice(musicStart, ambienceStart), /playAmbience\(/,
    "CRI runtime must not decide when the ambience bed starts");
  assert.match(deckSource, /native\.criPlayAmbience\(\)/);
  assert.match(runtimeSource, /startFileAtVolume\(CHANNEL_VINYL_CRACKLE/);
  assert.match(runtimeSource, /CHANNEL_STYLUS/);
  assert.match(runtimeSource, /CHANNEL_RECORD/);
  assert.match(runtimeSource, /BUS_MUSIC\s*=\s*0/);
  assert.match(runtimeSource, /BUS_AMBIENCE\s*=\s*1/);
  assert.match(runtimeSource, /BUS_MECHANICAL\s*=\s*2/);
  assert.match(runtimeSource, /BUS_UI\s*=\s*3/);
  assert.match(runtimeSource, /BUS_SFX\s*=\s*4/);
  assert.match(runtimeSource, /setAmbienceVolume\(int value\)/);
  assert.match(nativeSource, /kChannelCount\s*=\s*6/);
});

test("Bundled ADX is retained in memory and loops through CRI's seamless data callback", () => {
  assert.match(nativeSource, /loadAdxMemoryAsset\(const std::string& path\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetData\(player, memoryAdx->data\(\), static_cast<CriSint32>\(memoryAdx->size\(\)\)\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetDataRequestCallback\([\s\S]*?repeatPreviousAdx/);
  assert.match(nativeSource, /criAtomPlayer_SetPreviousDataAgain\(player\)/);
  assert.match(nativeSource, /gMemoryAdxAssets\.clear\(\)/);
  assert.match(nativeSource, /gLoopEnabled\[channel\] = false/);
  assert.match(nativeSource, /gLoopCycleCounts\[channel\]\.fetch_add/);
});

test("CRI streaming initialization creates and destroys D-BAS before pools", () => {
  const createDbas = nativeSource.indexOf("criAtomDbas_Create");
  const adxPool = nativeSource.indexOf("criAtomExVoicePool_AllocateAdxVoicePool");
  const destroyDbas = nativeSource.indexOf("criAtomDbas_Destroy");
  assert.ok(createDbas >= 0 && adxPool > createDbas, "D-BAS must exist before streaming voice pools");
  assert.match(nativeSource, /criAtomDbas_SetDefaultConfig\(&dbasConfig\)/);
  assert.match(nativeSource, /dbasConfig\.max_streams\s*=\s*kWaveMaxStreams/);
  assert.match(nativeSource, /dbasConfig\.max_bps\s*=\s*kWaveMaxBitrate/);
  assert.match(nativeSource, /kWaveMaxBitrate\s*=\s*192000\s*\*\s*2\s*\*\s*16/);
  assert.match(nativeSource, /criAtomDbas_CalculateWorkSize\(&dbasConfig\)/);
  assert.match(nativeSource, /CRIATOMDBAS_ILLEGAL_ID/);
  assert.ok(destroyDbas > adxPool, "D-BAS is destroyed after the voice pools");
  assert.match(nativeSource, /std::free\(gDbasWork\)/);
});

test("Bundled ADX uses a memory voice pool while imported Wave remains streamed", () => {
  assert.match(nativeSource, /criAtomExVoicePool_CalculateWorkSizeForAdxVoicePool/);
  assert.match(nativeSource, /criAtomExVoicePool_AllocateAdxVoicePool/);
  assert.match(nativeSource, /voicePoolConfig\.player_config\.streaming_flag\s*=\s*CRI_FALSE/);
  assert.match(nativeSource, /criAtomExVoicePool_CalculateWorkSizeForWaveVoicePool/);
  assert.match(nativeSource, /criAtomExVoicePool_AllocateWaveVoicePool/);
  assert.match(nativeSource, /wavePoolConfig\.player_config\.streaming_flag\s*=\s*CRI_TRUE/);
  assert.match(nativeSource, /std::free\(gWaveVoicePoolWork\)/);
  assert.match(nativeSource, /std::free\(gAdxVoicePoolWork\)/);
});

test("CRI Tween owns fades; the Java runtime does not simulate a 20ms volume ramp", () => {
  assert.match(nativeSource, /criAtomExTween_Create/);
  assert.match(nativeSource, /criAtomExPlayer_AttachTween/);
  assert.match(nativeSource, /criAtomExTween_MoveTo/);
  assert.match(nativeSource, /criAtomExPlayer_Update/);
  assert.match(runtimeSource, /nativeFadeVolume\(channel, duration, end\)/);
  assert.doesNotMatch(runtimeSource, /FADE_FRAME_MS|SystemClock\.uptimeMillis/);
});

test("CRI playback state drives visual-only disc, motor and stylus motion", () => {
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.needleDown/);
  assert.match(source, /player\.classList\.toggle\("is-needle-down", state\.needleDown\)/);
  assert.match(source, /player\.classList\.toggle\("is-playing", state\.isPlaying\)/);
  assert.match(source, /player\.classList\.toggle\("is-paused", state\.isPaused\)/);
  assert.match(source, /player\.classList\.toggle\("is-needle-down", state\.needleDown\)/);
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.needleDown/);
  assert.match(audioVisualSource, /targetSpeed = playing \? 200 : 0/);
  assert.match(audioVisualSource, /requestFrame\(tick\)/);
  assert.match(cssSource, /\.audio-player\.is-needle-down \.turntable-needle/);
  assert.match(cssSource, /\.audio-player\.is-paused \.turntable-needle/);
  assert.match(cssSource, /\.audio-player\.is-playing \.vinyl-disc/);
});

test("The turntable motor eases up to LP speed and brakes smoothly", async () => {
  const callbacks = new Map();
  let nextId = 1;
  const { createTurntableMotion } = await import("../web/src/audio-player.js?turntable-test");
  const motion = createTurntableMotion({
    requestFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id) { callbacks.delete(id); }
  });
  const step = time => {
    const entry = callbacks.entries().next().value;
    assert.ok(entry, "an animation frame should be scheduled");
    callbacks.delete(entry[0]);
    entry[1](time);
  };
  motion.setPlaying(true);
  step(0);
  for (let i = 1; i <= 60; i++) step(i * 16);
  const running = motion.getState();
  assert.ok(running.speed > 150 && running.speed < 201);
  assert.ok(running.angle > 0);
  motion.setPlaying(false);
  for (let i = 61; i <= 240 && callbacks.size; i++) step(i * 16);
  const stopped = motion.getState();
  assert.equal(stopped.speed, 0);
  assert.equal(stopped.running, false);
  motion.dispose();
});

test("Continuous file loops use a native monitor while CRI owns its MULTI server thread", () => {
  const monitor = nativeSource.indexOf("gLoopMonitorThread = std::thread");
  const loopCheck = nativeSource.indexOf("CRIATOMEXPLAYER_STATUS_PLAYEND", monitor);
  const uiStatus = nativeSource.indexOf("Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeGetStatus");
  assert.ok(monitor >= 0 && loopCheck > monitor && uiStatus > loopCheck);
  assert.match(nativeSource, /CRI default configuration uses the MULTI thread model/);
  assert.doesNotMatch(nativeSource, /criAtomEx_ExecuteMain\s*\(/);
  assert.ok(nativeSource.includes("++gLoopCycleCounts[channel]"));
  assert.match(runtimeSource, /nativeTakeLoopCycles\(channel\)/);
});

test("Vinyl labels rotate on CRI playback-cycle callbacks, track changes and seasons", () => {
  assert.match(source, /onPlaybackCycle:\s*\(\)\s*=>\s*\{\s*if\s*\(vinylDesigns\.getState\(\)\.mode\s*===\s*"auto"\)\s*vinylDesigns\.rotateRandom\("track-end"\);/);
  assert.match(source, /vinylDesigns\.rotateRandom\("track-change"\)/);
  assert.match(source, /vinylDesigns\.onSeasonStart\(seasonKey\)/);
  assert.match(runtimeSource, /nativeTakeLoopCycles\(channel\)/);
  assert.match(nativeSource, /gLoopCycleCounts\[channel\]/);
});

test("Selecting a record keeps its sleeve-to-platter flight as a visual-only transition", () => {
  const start = source.indexOf("function animateRecordToPlatter");
  const end = source.indexOf("function mountAudioSettings", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const placement = source.slice(start, end);
  assert.match(placement, /className\s*=\s*"audio-record-flight"/);
  assert.match(placement, /duration:\s*680/);
  assert.match(placement, /onComplete/);
  assert.match(cssSource, /\.audio-record-flight\s*\{/);
  assert.match(source, /audioDirector\.playEffect\("record-placement"\)/);
});

test("CRI file playback configures format metadata before loading and starting", () => {
  assert.match(runtimeSource, /readAudioMetadata\(File file, int format\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetNumChannels\(player, numChannels\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetSamplingRate\(player, samplingRate\)/);
  const format = nativeSource.indexOf("criAtomExPlayer_SetFormat(player");
  const channels = nativeSource.indexOf("criAtomExPlayer_SetNumChannels(player");
  const rate = nativeSource.indexOf("criAtomExPlayer_SetSamplingRate(player");
  const file = nativeSource.indexOf("criAtomExPlayer_SetFile(player");
  const start = nativeSource.indexOf("criAtomExPlayer_Start(player)", file);
  assert.ok(format >= 0 && format < channels && channels < rate && rate < file && file < start);
});

test("The Audio Director tracks ambience failures separately from BGM playback", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?ambience-state-test");
  const director = createPocketAudioDirector({
    native: {
      criPlayTrack() { return true; },
      criPlayAmbience() { return true; },
      criSetVolume() {},
      criStopMusic() {}
    }
  });
  director.updateNativeState("music", "playing");
  director.updateNativeState("vinyl-crackle", "error", "Vinyl stream unavailable");
  assert.equal(director.getState().status, "playing");
  assert.equal(director.getState().ambienceStatus, "error");
});


test("Startup waits for the record-placement cue before fading in the selected BGM", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?startup-sequence-test");
  const calls = [];
  const director = createPocketAudioDirector({
    native: {
      criPlayEffect(id) { calls.push(["effect", id]); return true; },
      criPlayTrack(id) { calls.push(["track", id]); return true; },
      criPlayAmbience() { calls.push(["ambience"]); return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() { return true; }
    }
  });
  assert.equal(director.startStartupSequence(), true);
  assert.deepEqual(calls, [["effect", "record-placement"]]);
  assert.equal(director.getState().startupSequence, "record-placement");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("record", "playing");
  assert.equal(calls.length, 1, "BGM must not start while the record-placement cue is still playing");
  director.updateNativeState("record", "ended");
  assert.deepEqual(calls[1], ["track", "happy"]);
  assert.equal(director.getState().needleDown, true);
  director.updateNativeState("music", "playing");
  assert.deepEqual(calls[2], ["ambience"]);
  assert.equal(director.getState().startupSequence, "complete");
});

test("A user stylus request during startup is queued after record placement, not mixed over it", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?startup-needle-test");
  const calls = [];
  const director = createPocketAudioDirector({
    native: {
      criPlayEffect(id) { calls.push(["effect", id]); return true; },
      criPlayTrack(id) { calls.push(["track", id]); return true; },
      criPlayAmbience() { calls.push(["ambience"]); return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() { return true; }
    }
  });
  director.startStartupSequence();
  director.toggleNeedle();
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("record", "ended");
  assert.deepEqual(calls, [
    ["effect", "record-placement"],
    ["effect", "stylus-drop"]
  ]);
  assert.equal(director.getState().needleDown, true);
  director.updateNativeState("stylus", "ended");
  assert.deepEqual(calls[2], ["track", "happy"]);
});

test("Selecting another record while playing keeps the needle down through CRI PREP", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?switch-track-state-test");
  const calls = [];
  const director = createPocketAudioDirector({
    native: {
      criPlayTrack(id) { calls.push(["track", id]); return true; },
      criPlayEffect(id) { calls.push(["effect", id]); return true; },
      criPlayAmbience() { calls.push(["ambience"]); return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() { return true; }
    }
  });
  director.startPlayback();
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, true);
  assert.equal(director.selectTrack("chill"), true);
  director.updateNativeState("music", "preparing");
  assert.equal(director.getState().needleDown, true);
  assert.equal(director.getState().isStarting, true);
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, true);
});

test("Changing the selected record while paused keeps the stylus lifted until the user lowers it", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?paused-track-change-test");
  const calls = [];
  const director = createPocketAudioDirector({
    native: {
      criPlayTrack(id) { calls.push(["track", id]); return true; },
      criPlayEffect(id) { calls.push(["effect", id]); return true; },
      criPlayAmbience() { calls.push(["ambience"]); return true; },
      criSetVolume() {},
      criPauseMusic(paused) { calls.push(["pause", paused]); return true; },
      criStopMusic() { return true; }
    }
  });
  director.startPlayback();
  director.updateNativeState("music", "playing");
  director.toggleNeedle();
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.selectTrack("retroatrical1");
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.toggleNeedle();
  assert.equal(calls.at(-1)[0], "pause");
  assert.equal(calls.at(-1)[1], false);
  assert.equal(director.getState().needleDown, true);
});

test("Turntable render loop suspends only in bubble mode and resumes at its retained angle", async () => {
  const callbacks = new Map();
  let nextId = 1;
  const { createTurntableMotion } = await import("../web/src/audio-player.js?floating-motion-test");
  const motion = createTurntableMotion({
    requestFrame(callback) { const id = nextId++; callbacks.set(id, callback); return id; },
    cancelFrame(id) { callbacks.delete(id); }
  });
  const step = time => {
    const entry = callbacks.entries().next().value;
    assert.ok(entry, "a visible running platter should schedule a frame");
    callbacks.delete(entry[0]);
    entry[1](time);
  };
  motion.setPlaying(true);
  step(0);
  for (let i = 1; i <= 25; i++) step(i * 16);
  const beforeHide = motion.getState();
  motion.setRenderEnabled(false);
  assert.equal(callbacks.size, 0, "bubble mode must not keep a hidden animation-frame loop alive");
  assert.equal(motion.getState().angle, beforeHide.angle);
  assert.equal(motion.getState().speed, beforeHide.speed);
  motion.setRenderEnabled(true);
  assert.equal(callbacks.size, 1, "full and mini-window mode restore the visual motor");
  step(500); // first restored frame initializes its clock without advancing the angle
  step(516);
  assert.ok(motion.getState().angle !== beforeHide.angle);
  motion.setRenderEnabled(false);
  motion.setPlaying(false);
  assert.equal(motion.getState().speed, 0, "a pause received in bubble mode must be reflected on restore");
  motion.setRenderEnabled(true);
  assert.equal(callbacks.size, 0, "a stopped platter must stay stopped after restore");
  motion.dispose();
});

test("Pocket updater is shown and operated from Android device notifications, not Settings", () => {
  assert.doesNotMatch(source, /data-update-section|mountPocketUpdateSettings/);
  assert.match(source, /native\?\.showPocketUpdateNotification\?/);
  assert.match(source, /void checkPocketUpdates\(true\)/);
  assert.match(bridgeSource, /setOnClickPendingIntent\(R\.id\.pocket_update_notification_action, downloadUpdate\)/);
  assert.match(bridgeSource, /MainActivity\.ACTION_DOWNLOAD_UPDATE/);
  assert.match(workerSource, /\.addAction\(R\.drawable\.ic_notification_tv, "DOWNLOAD UPDATE", download\)/);
  assert.match(workerSource, /putExtra\(MainActivity\.EXTRA_UPDATE_URL, apkUrl\)/);
  assert.match(activitySource, /ACTION_DOWNLOAD_UPDATE\.equals\(action\)/);
  assert.doesNotMatch(cssSource, /\.update-section\{[^}]*z-index:31/);
  assert.doesNotMatch(cssSource, /\.update-section-toggle,\.update-actions button/);
  assert.match(source, /const timeoutId=window\.setTimeout\(\(\)=>controller\.abort\(\),45000\)/);
  assert.match(source, /window\.clearTimeout\(timeoutId\);\s*pocketUpdateCheckBusy=false/);
  assert.match(source, /method !== "checkPocketUpdate"/);
});

test("Floating window transitions reuse the same CRI runtime and do not pause playback", () => {
  assert.match(activitySource, /nativeBridge = new PocketNativeBridge\(this, webView\)/);
  assert.match(activitySource, /nativeBridge\.dispose\(\)/);
  assert.match(floatingSource, /contentFrame\.addView\(webView/);
  assert.match(floatingSource, /activity\.setContentView\(webView\)/);
  assert.match(floatingSource, /dispatchRenderMode\("window"/);
  assert.match(floatingSource, /dispatchRenderMode\("bubble"/);
  assert.match(floatingSource, /dispatchRenderMode\("full"/);
  assert.doesNotMatch(floatingSource, /criStopMusic|criPauseMusic|PocketCriAudioRuntime/,
    "window mode changes must not issue playback stop or pause commands");
  assert.match(source, /activeTurntableMotion\?\.setRenderEnabled\(!bubbleVisualSuspended\)/);
});
