import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const buildWorkflowSource = readFileSync(new URL("../../.github/workflows/pocket-design-review-apk.yml", import.meta.url), "utf8");
const audioVisualSource = readFileSync(new URL("../web/src/audio-player.js", import.meta.url), "utf8");
const deckSource = readFileSync(new URL("../web/src/pocket-audio-director.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketCriAudioRuntime.java", import.meta.url), "utf8");
const importerSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketAudioImporter.java", import.meta.url), "utf8");
const adxDecoderSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketAdxDecoder.java", import.meta.url), "utf8");
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

test("Turntable motion follows real CRI playback/preparing status and the stylus position", () => {
  assert.match(source, /audioDirector\.updateNativeState\(channel, state, error\)/);
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.motorRunning && !reducedMotion\(\)\)/);
  assert.match(source, /player\.classList\.toggle\("is-playing", state\.isPlaying\)/);
  assert.match(source, /player\.classList\.toggle\("is-paused", state\.isPaused\)/);
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
  assert.equal(deck.getState().needleDown, false, "the tonearm stays parked while the BGM file is prepared");
  deck.updateNativeState("music", "playing");
  assert.equal(deck.getState().needleDown, false, "the motor spins up with the tonearm raised");
  assert.equal(deck.getState().motorRunning, true);
  assert.equal(calls.length, 2, "vinyl crackle waits for stylus contact");
  deck.updateNativeState("stylus", "playing");
  assert.equal(deck.getState().needleDown, true, "the arm lowers when CRI confirms stylus contact");
  assert.deepEqual(calls[2], ["ambience"], "vinyl crackle begins with contact on the groove");
  assert.equal(deck.selectTrack("retroatrical1"), true);
  assert.deepEqual(calls.slice(3, 5), [
    ["pause", true],
    ["play", "retroatrical1"]
  ], "a new side lifts the tonearm, fades out the old side and loads the selected side paused");
  deck.updateNativeState("music", "paused");
  deck.toggleNeedle();
  assert.deepEqual(calls[5], ["pause", false], "resuming raises the playback request but waits for CRI PLAYING before lowering the stylus");
  assert.equal(deck.getState().needleDown, false);
  deck.updateNativeState("music", "playing");
  assert.equal(deck.getState().needleDown, false);
  deck.updateNativeState("stylus", "playing");
  assert.equal(deck.getState().needleDown, true);
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

test("Bundled CRI ADX is decoded to canonical PCM16 WAV before CRI playback", () => {
  assert.match(runtimeSource, /PocketAdxDecoder\.decodeToWav\(source, wav\)/);
  assert.match(runtimeSource, /prepareAdxForCri/);
  assert.match(runtimeSource, /FORMAT_WAVE\s*=\s*2/);
  assert.match(runtimeSource, /cri-audio-pcm/);
  assert.match(runtimeSource, /beginMusicPlayback\(wav, FORMAT_WAVE/);
  assert.match(adxDecoderSource, /BLOCK_BYTES\s*=\s*18/);
  assert.match(adxDecoderSource, /BLOCK_SAMPLES\s*=\s*32/);
  assert.match(adxDecoderSource, /calculateCoefficients/);
  assert.match(adxDecoderSource, /writeWavHeader/);
  assert.match(adxDecoderSource, /0x08/);
  assert.match(nativeSource, /criAtomExPlayer_SetFile\(player, nullptr, path\.c_str\(\)\)/);
  assert.match(nativeSource, /CRIATOMEX_FORMAT_WAVE/);
  assert.doesNotMatch(nativeSource, /kFormatWaveMemory|gMemoryWaveAssets|gRetiredMemoryWaveAssets/);
});

test("Decoded PCM WAV and imported PCM WAV share six CRI streaming voices", () => {
  assert.match(nativeSource, /wavePoolConfig\.num_voices\s*=\s*kChannelCount/);
  assert.match(nativeSource, /wavePoolConfig\.player_config\.streaming_flag\s*=\s*CRI_TRUE/);
  assert.match(nativeSource, /criAtomExVoicePool_AllocateWaveVoicePool\(&wavePoolConfig/);
  assert.match(nativeSource, /wavePoolConfig\.player_config\.max_channels\s*=\s*2/);
  assert.match(nativeSource, /wavePoolConfig\.player_config\.max_sampling_rate\s*=\s*192000/);
  assert.match(nativeSource, /kWaveMaxStreams\s*=\s*kChannelCount/);
  assert.match(nativeSource, /kCustomWaveMaxBitrate\s*=\s*192000\s*\*\s*2\s*\*\s*16/);
  assert.match(nativeSource, /kBuiltInWaveMaxBitrate\s*=\s*48000\s*\*\s*2\s*\*\s*16/);
  assert.match(nativeSource, /kWaveMaxBitrate\s*=\s*kCustomWaveMaxBitrate\s*\+\s*\(kChannelCount\s*-\s*1\)\s*\*\s*kBuiltInWaveMaxBitrate/);
  assert.match(nativeSource, /dbasConfig\.max_streams\s*=\s*kWaveMaxStreams/);
  assert.match(nativeSource, /dbasConfig\.max_bps\s*=\s*kWaveMaxBitrate/);
});

test("CRI streaming initialization creates and destroys D-BAS before pools", () => {
  const createDbas = nativeSource.indexOf("criAtomDbas_Create");
  const adxPool = nativeSource.indexOf("criAtomExVoicePool_AllocateAdxVoicePool");
  const destroyDbas = nativeSource.indexOf("criAtomDbas_Destroy");
  assert.ok(createDbas >= 0 && adxPool > createDbas, "D-BAS must exist before streaming voice pools");
  assert.match(nativeSource, /criAtomDbas_SetDefaultConfig\(&dbasConfig\)/);
  assert.match(nativeSource, /dbasConfig\.max_streams\s*=\s*kWaveMaxStreams/);
  assert.match(nativeSource, /dbasConfig\.max_bps\s*=\s*kWaveMaxBitrate/);
  assert.match(nativeSource, /kWaveMaxBitrate\s*=\s*kCustomWaveMaxBitrate/);
  assert.match(nativeSource, /criAtomDbas_CalculateWorkSize\(&dbasConfig\)/);
  assert.match(nativeSource, /CRIATOMDBAS_ILLEGAL_ID/);
  assert.ok(destroyDbas > adxPool, "D-BAS is destroyed after the voice pools");
  assert.match(nativeSource, /std::free\(gDbasWork\)/);
});

test("Legacy ADX memory playback remains available alongside decoded-WAV streaming", () => {
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
  assert.match(runtimeSource, /postDelayed\(\(\) -> \{[\s\S]*?fadeChannelTo\(CHANNEL_MUSIC, 1f, 760L, null\)/);
  assert.match(runtimeSource, /\}, 820L\)/, "BGM fade-in waits for the tonearm contact lead-in");
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC, 0f, 170L, null\)/, "pause fades BGM out");
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC, 0f, 150L, null\)/, "stop fades BGM out");
  assert.doesNotMatch(runtimeSource, /FADE_FRAME_MS|SystemClock\.uptimeMillis/);
});

test("CRI playback state drives visual-only disc, motor and stylus motion", () => {
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.motorRunning/);
  assert.match(source, /player\.classList\.toggle\("is-needle-down", state\.needleDown\)/);
  assert.match(source, /player\.classList\.toggle\("is-playing", state\.isPlaying\)/);
  assert.match(source, /player\.classList\.toggle\("is-paused", state\.isPaused\)/);
  assert.match(source, /player\.classList\.toggle\("is-needle-down", state\.needleDown\)/);
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.motorRunning/);
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

test("CRI Android output is tuned and the thread model is pinned before AtomEx initializes", () => {
  // Build 379 elimination: the SDK's Android default is MULTI_WITH_SONICSYNC and Pocket never set
  // the buffering times that cri_le_atom_android.h documents as a source of device noise.
  const setDefaults = nativeSource.indexOf("criAtomEx_SetDefaultConfig_ANDROID(&config)");
  const pinModel = nativeSource.indexOf("config.atom_ex.thread_model = CRIATOMEX_THREAD_MODEL_MULTI;");
  const tune = nativeSource.indexOf("applyAndroidOutputTuning(env, context);");
  const calc = nativeSource.indexOf("criAtomEx_CalculateWorkSize_ANDROID(&config)");
  const init = nativeSource.indexOf("criAtomEx_Initialize_ANDROID(&config");
  assert.ok(setDefaults >= 0 && pinModel > setDefaults && pinModel < calc,
    "the plain MULTI thread model must be pinned right after the Android defaults are applied");
  assert.ok(tune > calc && tune < init, "Android output tuning must run immediately before AtomEx initialization");
  assert.ok(nativeSource.includes("criAtom_ApplyHardwareProperties_ANDROID(javaVm, gAppContext)"));
  assert.ok(nativeSource.includes("criAtom_SetSoundStartBufferingTime_ANDROID(kAndroidStartBufferingMs)"));
  assert.ok(nativeSource.includes("criAtom_SetSoundBufferingTime_ANDROID(kAndroidBufferingMs)"));
  const start = Number(/kAndroidStartBufferingMs\s*=\s*(\d+)/.exec(nativeSource)?.[1]);
  const steady = Number(/kAndroidBufferingMs\s*=\s*(\d+)/.exec(nativeSource)?.[1]);
  assert.ok(start >= 100 && steady >= start, "steady buffering must not be shorter than the start buffering");
  assert.ok(steady <= 1000, "buffering must stay bounded so fades and stylus changes still feel immediate");
  // Build 381 requested AAudio and the distortion did not change; the PCM arm returns to the SDK default API.
  assert.doesNotMatch(nativeSource, /criAtom_EnableAAudio_ANDROID\s*\(/);
  assert.match(nativeSource, /nativeInit\(JNIEnv\* env, jclass, jobject context\)/);
  assert.match(nativeSource, /releaseAndroidContext\(env\);[\s\S]*?gMemoryAdxAssets\.clear\(\)/);
  assert.match(runtimeSource, /private static native boolean nativeInit\(Context context\)/);
  assert.match(runtimeSource, /nativeInit\(activity\.getApplicationContext\(\)\)/);
  assert.doesNotMatch(nativeSource, /criAtomEx_ExecuteMain\s*\(/, "CRI's MULTI server thread must remain the only scheduler");
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
  assert.match(placement, /duration:\s*760/);
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
  director.updateNativeState("record", "idle");
  assert.equal(calls.length, 1, "an IDLE poll during ADX decoding must not skip the placement cue");
  assert.equal(director.getState().startupSequence, "record-placement");
  director.updateNativeState("record", "playing");
  assert.equal(calls.length, 1, "BGM must not start while the record-placement cue is still playing");
  director.updateNativeState("record", "ended");
  assert.deepEqual(calls[1], ["track", "happy"]);
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("music", "preparing");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, false);
  assert.equal(director.getState().motorRunning, true);
  assert.equal(calls.length, 2, "ambience must wait until the stylus reaches the record");
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true);
  assert.deepEqual(calls[2], ["ambience"]);
  assert.equal(director.getState().startupSequence, "complete");
  director.stop();
});

test("Startup fallback waits for actual CRI playback; stylus contact is timed by native CRI runtime", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?physical-timing-test");
  const calls = [];
  const timers = new Map();
  let nextTimer = 1;
  const director = createPocketAudioDirector({
    startupEffectTimeoutMs: 6000,
    setTimeoutFn(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeoutFn(id) { timers.delete(id); },
    native: {
      criPlayEffect(id) { calls.push(["effect", id]); return true; },
      criPlayTrack(id) { calls.push(["track", id]); return true; },
      criPlayAmbience() { calls.push(["ambience"]); return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() {}
    }
  });

  director.startStartupSequence();
  assert.equal(timers.size, 0, "PCM decode time must not consume the SFX fallback window");
  director.updateNativeState("record", "idle");
  assert.equal(timers.size, 0, "an early IDLE poll must not advance startup");
  director.updateNativeState("record", "playing");
  assert.deepEqual([...timers.values()].map(timer => timer.delay), [6000]);
  director.updateNativeState("record", "ended");
  assert.equal(timers.size, 0, "the completed record-placement cue clears its fallback timer");
  assert.deepEqual(calls[1], ["track", "happy"]);

  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, false);
  assert.equal(director.getState().motorRunning, true);
  assert.equal(timers.size, 0, "WebView timers are not used to trigger stylus contact");
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true, "tonearm follows the native stylus SFX channel");
  assert.doesNotMatch(deckSource, /scheduleStylusDrop|clearStylusDropTimeout|setTimeoutFn\(\(\) =>[\s\S]*?stylus-drop/);
  assert.match(runtimeSource, /scheduleStylusContact\(generation, pauseTransition\.get\(\)\)/);
  assert.match(runtimeSource, /playEffect\("stylus-drop"\)/);
  assert.match(runtimeSource, /\}, 620L\)/);
  assert.match(runtimeSource, /warmBuiltInAdx\("stylus-drop"\)/);
  director.stop();
});

test("A late stylus-contact callback cannot lower the tonearm after pause", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?late-stylus-pause-test");
  const director = createPocketAudioDirector({
    native: {
      criPlayTrack() { return true; },
      criPlayEffect() { return true; },
      criPlayAmbience() { return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() {}
    }
  });
  director.startPlayback();
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().motorRunning, true);
  assert.equal(director.getState().needleDown, false);

  director.toggleNeedle();
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, false, "a stale contact event must not put the needle back on the record");
  assert.equal(director.getState().motorRunning, true, "pause lifts the needle without forcing the platter motor off");
  director.stop();
});

test("Record-placement SFX fires after the record finishes travelling to the platter", () => {
  assert.match(source, /animateRecordToPlatter\(button,\s*\(\)\s*=>\s*audioDirector\.playEffect\("record-placement"\)\)/);
  assert.match(source, /duration:\s*760/);
  assert.match(source, /translateY:\s*\[0,\s*-7,\s*0\]/);
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
  director.updateNativeState("record", "playing");
  director.updateNativeState("record", "ended");
  assert.deepEqual(calls, [
    ["effect", "record-placement"],
    ["track", "happy"]
  ], "the queued stylus request must not play a contact SFX before CRI starts the music");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, false);
  assert.equal(calls.length, 2);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true);
  assert.equal(calls[2][0], "ambience");
  director.stop();
});

test("Selecting another record lifts the tonearm during CRI PREP and lowers it only after start", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?switch-track-state-test");
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
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true);
  assert.equal(director.selectTrack("chill"), true);
  assert.deepEqual(calls.slice(-2), [["pause", true], ["track", "chill"]]);
  director.updateNativeState("music", "preparing");
  assert.equal(director.getState().needleDown, false);
  assert.equal(director.getState().isStarting, true);
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.toggleNeedle();
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true);
  director.stop();
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
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  director.toggleNeedle();
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.selectTrack("retroatrical1");
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  director.toggleNeedle();
  assert.equal(calls.at(-1)[0], "pause");
  assert.equal(calls.at(-1)[1], false);
  assert.equal(director.getState().needleDown, false, "tonearm waits for the resumed CRI PLAYING state");
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().needleDown, true);
  director.stop();
});

test("The platter motor keeps spinning on pause but stops for a record change", async () => {
  const { createPocketAudioDirector } = await import("../web/src/pocket-audio-director.js?motor-lifecycle-test");
  const director = createPocketAudioDirector({
    native: {
      criPlayTrack() { return true; },
      criPlayEffect() { return true; },
      criPlayAmbience() { return true; },
      criSetVolume() {},
      criPauseMusic() { return true; },
      criStopMusic() {}
    }
  });
  director.startPlayback();
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().motorRunning, true);
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true);

  director.toggleNeedle();
  director.updateNativeState("music", "paused");
  assert.equal(director.getState().needleDown, false);
  assert.equal(director.getState().motorRunning, true, "lifting the stylus must not stop the platter motor");

  director.selectTrack("chill");
  assert.equal(director.getState().motorRunning, false, "changing sides stops the platter while the new record is installed");
  director.updateNativeState("music", "paused");
  director.toggleNeedle();
  director.updateNativeState("music", "playing");
  assert.equal(director.getState().motorRunning, true, "the new side's platter spins up first");
  assert.equal(director.getState().needleDown, false);
  director.updateNativeState("stylus", "playing");
  assert.equal(director.getState().needleDown, true, "native stylus contact lowers the tonearm");
  director.stop();
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

test("Legacy source audio is excluded from the web distribution and final APK", () => {
  assert.ok(buildWorkflowSource.includes('rm -rf "$DIST/audio"'));
  assert.ok(buildWorkflowSource.includes("find \"$DIST\" -type f"));
  assert.ok(buildWorkflowSource.includes("test \"$ADX_COUNT\" -eq 7"));
  assert.ok(buildWorkflowSource.includes("Legacy source audio is still present in the app distribution."));
  assert.ok(buildWorkflowSource.includes("Legacy OGG/MP3/WAV or other source audio was found inside the APK."));
  assert.ok(buildWorkflowSource.includes('unzip -Z1 "$APK"'));
});

test("Bundled CRI ADX assets are copied directly and header-validated without per-build transcoding", () => {
  assert.ok(buildWorkflowSource.includes("Bundle pre-converted CRI ADX assets without a conversion bridge"));
  assert.ok(buildWorkflowSource.includes('Happy-1a_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('chill-1a_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('Retroatrical-a1_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('Retroatrical-2_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('needle drop+vinyls crackle_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('organic vinyl record crackle_dragdropdo.adx'));
  assert.ok(buildWorkflowSource.includes('record placement_dragdropdo.adx'));
  assert.match(buildWorkflowSource, /data\[4\] != 3/);
  assert.match(buildWorkflowSource, /data\[7\]/);
  assert.match(buildWorkflowSource, /data\[8:12\]/);
  assert.match(buildWorkflowSource, /Expected exactly the seven supplied ADX assets/i);
  assert.doesNotMatch(buildWorkflowSource, /ffmpeg|adpcm_adx|apt-get install -y ffmpeg/i);
});

test("Original Settings updater remains mounted and Download calls the validated native updater", () => {
  assert.match(source, /data-update-section/);
  assert.match(source, /data-update-download/);
  assert.match(source, /data-update-check/);
  assert.match(source, /data-update-install/);
  assert.match(source, /function mountPocketUpdateSettings\(\)/);
  assert.match(source, /const updateCleanup=mountPocketUpdateSettings\(\)/);
  assert.match(source, /downloadButton\?\.addEventListener\("click",download\)/);
  assert.match(source, /native\.startPocketUpdateDownload\([\s\S]*?update\.apkUrl[\s\S]*?update\.apkSha256/);
  assert.match(source, /downloadButton\.textContent="RETRY DOWNLOAD"/);
  assert.match(source, /function refreshPocketUpdatePanel\(downloadState=null\)/);
  assert.match(source, /native\?\.showPocketUpdateNotification\?/);
  assert.match(source, /void checkPocketUpdates\(true\)/);
  assert.match(bridgeSource, /setOnClickPendingIntent\(R\.id\.pocket_update_notification_action, downloadUpdate\)/);
  assert.match(bridgeSource, /MainActivity\.ACTION_DOWNLOAD_UPDATE/);
  assert.match(workerSource, /\.addAction\(R\.drawable\.ic_notification_tv, "DOWNLOAD UPDATE", download\)/);
  assert.match(workerSource, /putExtra\(MainActivity\.EXTRA_UPDATE_URL, apkUrl\)/);
  assert.match(activitySource, /ACTION_DOWNLOAD_UPDATE\.equals\(action\)/);
  assert.doesNotMatch(cssSource, /\.update-section\{[^}]*z-index:31/);
  assert.doesNotMatch(cssSource, /\.update-section-toggle,\.update-actions button/);
  assert.match(bridgeSource, /setNotificationVisibility\(DownloadManager\.Request\.VISIBILITY_VISIBLE\)/, "public apps must use a DownloadManager visibility mode they are allowed to request");
  assert.doesNotMatch(bridgeSource, /setNotificationVisibility\(DownloadManager\.Request\.VISIBILITY_HIDDEN\)/, "VISIBILITY_HIDDEN requires privileged DOWNLOAD_WITHOUT_NOTIFICATION access");
  assert.match(bridgeSource, /clearPocketUpdateAvailableNotification\(\)/, "starting an update clears the stale availability action before DownloadManager shows its progress notification");
  assert.doesNotMatch(bridgeSource, /startPocketUpdateProgressService\(\)/, "do not layer a second foreground progress notification over Android DownloadManager");
    assert.match(source, /const timeoutId=window\.setTimeout\(\(\)=>controller\.abort\(\),45000\)/);
  assert.match(source, /window\.clearTimeout\(timeoutId\);\s*pocketUpdateCheckBusy=false/);
  assert.match(source, /method !== "checkPocketUpdate"/);
});

test("Changing render mode never pauses CRI; mini window remains live and bubble only suspends visuals", () => {
  const start = source.indexOf("function applyFloatingRenderMode(mode)");
  const end = source.indexOf("window.addEventListener(\"pocket:render-mode\"", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const modeHandler = source.slice(start, end);
  assert.match(modeHandler, /engine\.pauseOnDocumentHidden = mode !== "window"/);
  assert.match(modeHandler, /if \(bubbleVisualSuspended\) engine\.pause\(\)/);
  assert.match(modeHandler, /else engine\.resume\(\)/);
  assert.match(modeHandler, /activeTurntableMotion\?\.setRenderEnabled\(!bubbleVisualSuspended\)/);
  assert.doesNotMatch(modeHandler, /audioDirector\.(stop|toggleNeedle)|criPauseMusic|criStopMusic/);
  assert.match(floatingSource, /contentFrame\.addView\(webView/);
  assert.match(floatingSource, /activity\.setContentView\(webView\)/);
  assert.match(floatingSource, /webView\.post\(\(\) -> webView\.evaluateJavascript/);
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


test("Seven Merzkava Official Theme ADX tracks are listed as protected built-in BGM", () => {
  for (let number = 1; number <= 7; number++) {
    const id = "officialtheme" + number;
    const filename = "merzkava-official-theme-" + number + ".adx";
    assert.match(deckSource, new RegExp('id:"' + id + '".*title:"Merzkava Official Theme - ' + number + '".*extension:"ADX"'));
    assert.ok(runtimeSource.includes('BUILT_IN.put("' + id + '", "' + filename + '")'));
    assert.match(buildWorkflowSource, new RegExp('Merzkava Official Theme - \\$\\{number\\}\\.adx'));
    assert.ok(filename.endsWith(".adx"));
  }
  assert.match(buildWorkflowSource, /local target_name="merzkava-official-theme-\$\{number\}\.adx"/);
  assert.match(buildWorkflowSource, /range\(1, 8\)/);
  assert.match(source, /audioDirector\.getTracks\(\)/);
  assert.match(source, /CRI ADX · POCKET BGM/);
  assert.match(buildWorkflowSource, /test "\$ADX_COUNT" -eq 14/);
});

test("Settings music picker imports ADX directly and reuses the native CRI ADX decoder", () => {
  assert.match(activitySource, /intent\.setType\("\*\/\*"\)/);
  assert.match(activitySource, /application\/octet-stream/);
  assert.match(importerSource, /static Result copyAdxSource\(/);
  assert.match(importerSource, /PocketAdxDecoder\.inspect\(temporaryAdx\)/);
  assert.match(bridgeSource, /PocketAudioImporter\.copyAdxSource\(activity, uri, temporary\)/);
  assert.match(bridgeSource, /playbackType", adxSource \? "CRI_ADX" : "CRI_WAVE"/);
  assert.match(runtimeSource, /new File\(musicDirectory, customId \+ "\.adx"\)/);
  assert.match(runtimeSource, /prepareAdxForCri\(file, CHANNEL_MUSIC/);
  assert.match(runtimeSource, /PocketAdxDecoder\.decodeToWav\(source, wav\)/);
  assert.match(bridgeSource, /trackId \+ "\.adx"/);
});
