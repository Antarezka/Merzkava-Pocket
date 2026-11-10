import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const audioVisualSource = readFileSync(new URL("../web/src/audio-player.js", import.meta.url), "utf8");
const deckSource = readFileSync(new URL("../web/src/cri-audio-deck.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketCriAudioRuntime.java", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketNativeBridge.java", import.meta.url), "utf8");
const nativeSource = readFileSync(new URL("../app/src/main/cpp/cri_audio_jni.cpp", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../web/src/styles.css", import.meta.url), "utf8");

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
  assert.doesNotMatch(mount, /AudioContext|new Audio\s*\(|\.play\(\)/);
});

test("Only CRI owns playback; the web layer has no parallel audio engine", () => {
  assert.match(source, /import \{ createCriAudioDeck \} from "\.\/cri-audio-deck\.js"/);
  assert.match(source, /criAudioDeck\.startAutomatically\(\)/);
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
  const { createCriAudioDeck } = await import("../web/src/cri-audio-deck.js?deck-test");
  const calls = [];
  const native = {
    criPlayTrack(id) { calls.push(["play", id]); return true; },
    criPauseMusic(paused) { calls.push(["pause", paused]); return true; },
    criPlayEffect(id) { calls.push(["effect", id]); return true; },
    criSetVolume(channel, value) { calls.push(["volume", channel, value]); },
    criStopMusic() { calls.push(["stop"]); return true; }
  };
  const deck = createCriAudioDeck({ native });
  assert.deepEqual(calls.slice(0, 2), [
    ["volume", "music", 68],
    ["volume", "effects", 76]
  ]);
  calls.length = 0;
  assert.equal(deck.selectTrack("chill"), true);
  assert.equal(calls.length, 0, "placing a record while idle must not start playback");
  assert.equal(deck.startAutomatically(), true);
  assert.deepEqual(calls.slice(0, 2), [["effect", "stylus-drop"], ["play", "chill"]]);
  deck.updateNativeState("music", "playing");
  assert.equal(deck.selectTrack("retroatrical1"), true);
  assert.deepEqual(calls[2], ["play", "retroatrical1"]);
  deck.updateNativeState("music", "paused");
  deck.toggleNeedle();
  assert.deepEqual(calls.slice(3, 5), [["effect", "stylus-drop"], ["pause", false]]);
  deck.updateNativeState("music", "playing");
  deck.toggleNeedle();
  assert.deepEqual(calls[5], ["pause", true]);
  deck.setMusicVolume(52);
  deck.setEffectsVolume(41);
  deck.playEffect("record-placement");
  deck.stop();
  assert.deepEqual(calls.slice(6), [
    ["volume", "music", 52],
    ["volume", "effects", 41],
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
  assert.match(runtimeSource, /startFileAtVolume\(CHANNEL_MUSIC[\s\S]*?if \(!ambienceStreamActive\) playAmbience\(\)/);
  assert.match(runtimeSource, /startFileAtVolume\(CHANNEL_VINYL_CRACKLE/);
  assert.match(runtimeSource, /CHANNEL_STYLUS/);
  assert.match(runtimeSource, /CHANNEL_RECORD/);
  assert.match(nativeSource, /kChannelCount\s*=\s*6/);
});

test("ADX and imported Wave streams have their own CRI pools and retained work memory", () => {
  assert.match(nativeSource, /criAtomExVoicePool_CalculateWorkSizeForAdxVoicePool/);
  assert.match(nativeSource, /criAtomExVoicePool_AllocateAdxVoicePool/);
  assert.match(nativeSource, /voicePoolConfig\.player_config\.streaming_flag\s*=\s*CRI_TRUE/);
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
  assert.match(source, /activeTurntableMotion\?\.setPlaying\(state\.isPlaying/);
  assert.match(source, /player\.classList\.toggle\("is-playing", state\.isPlaying\)/);
  assert.match(source, /player\.classList\.toggle\("is-paused", state\.isPaused\)/);
  assert.match(audioVisualSource, /targetSpeed = playing \? 200 : 0/);
  assert.match(audioVisualSource, /requestFrame\(tick\)/);
  assert.match(cssSource, /\.audio-player\.is-playing \.turntable-needle/);
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
  assert.match(source, /criAudioDeck\.playEffect\("record-placement"\)/);
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
