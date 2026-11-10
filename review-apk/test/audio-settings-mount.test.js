import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const audioSource = readFileSync(new URL("../web/src/audio-player.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketCriAudioRuntime.java", import.meta.url), "utf8");
const nativeSource = readFileSync(new URL("../app/src/main/cpp/cri_audio_jni.cpp", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../web/src/styles.css", import.meta.url), "utf8");

test("Settings mounts and disposes the Audio controls", () => {
  const start = source.indexOf('if(destination==="settings"){');
  const end = source.indexOf('if(destination==="economy"){', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = source.slice(start, end);
  assert.match(route, /const audioCleanup\s*=\s*mountAudioSettings\(\);/);
  assert.match(route, /audioCleanup\?\.\(\)/);
});

test("Audio mount binds disclosure, record selection, stylus and volume controls", () => {
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
});

test("BGM and vinyl surface noise use separate CRI channels", () => {
  assert.match(runtimeSource, /CHANNEL_MUSIC\s*=\s*0/);
  assert.match(runtimeSource, /CHANNEL_AMBIENCE\s*=\s*1/);
  assert.match(runtimeSource, /playTrack[\s\S]*fadeChannelTo\(CHANNEL_MUSIC/);
  assert.match(runtimeSource, /playAmbience[\s\S]*fadeChannelTo\(CHANNEL_AMBIENCE/);
  assert.match(nativeSource, /kChannelCount\s*=\s*6/);
  assert.match(audioSource, /native\.startPocketAmbience\?\.\(\)/);
});

test("CRI playback, pause, stop and focus ducking use per-channel fades", () => {
  assert.match(runtimeSource, /private void fadeChannelTo\(/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC, 0f, 170L/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_AMBIENCE, 0f, 170L/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC, volume\(musicVolume\), 230L/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_AMBIENCE, volume\(effectsVolume\), 280L/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC, volume\(musicVolume\) \* 0\.25f/);
});

test("the vinyl deck retains smooth motor and stylus transitions", () => {
  assert.match(audioSource, /const timeConstant = targetSpeed > speed \? 0\.48 : 0\.32/);
  assert.match(audioSource, /targetSpeed = playing \? 200 : 0/);
  assert.match(cssSource, /\.turntable-needle\{[\s\S]*transition:transform/);
  assert.match(cssSource, /\.audio-player\.is-playing \.turntable-needle/);
  assert.match(cssSource, /\.vinyl-disc\{transition:filter/);
});

test("the turntable motor eases up to LP speed and brakes smoothly", async () => {
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

test("automatic vinyl labels rotate on record changes and preserve manual selections", () => {
  assert.match(source, /onPlaybackCycle:\s*\(\)\s*=>\s*\{\s*if\s*\(vinylDesigns\.getState\(\)\.mode\s*===\s*"auto"\)\s*vinylDesigns\.rotateRandom\("track-end"\);\s*\}/);
  assert.match(source, /if\s*\(vinylDesigns\.getState\(\)\.mode\s*===\s*"auto"\)\s*vinylDesigns\.rotateRandom\("track-change"\)/);
});

test("record placement animates a vinyl sleeve onto the platter", () => {
  const start = source.indexOf("function animateRecordToPlatter");
  const end = source.indexOf("function mountAudioSettings", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const placement = source.slice(start, end);
  assert.match(placement, /className\s*=\s*"audio-record-flight"/);
  assert.match(placement, /duration:\s*680/);
  assert.match(placement, /onComplete/);
  assert.match(cssSource, /\.audio-record-flight\s*\{/);
});

test("CRI fade ramp uses timed smoothstep updates and isolates BGM from ambience", () => {
  assert.match(runtimeSource, /FADE_FRAME_MS\s*=\s*20L/);
  assert.match(runtimeSource, /linear\s*\*\s*linear\s*\*\s*\(3f\s*-\s*2f\s*\*\s*linear\)/);
  assert.match(runtimeSource, /Fade out only BGM[\s\S]*vinyl ambience channel is independent/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_MUSIC,\s*volume\(musicVolume\),\s*240L/);
  assert.match(runtimeSource, /fadeChannelTo\(CHANNEL_AMBIENCE,\s*volume\(effectsVolume\),\s*320L/);
});
test("CRI file playback reads ADX/WAV metadata and configures voice selection before SetFile", () => {
  assert.match(runtimeSource, /readAudioMetadata\(File file, int format\)/);
  assert.match(runtimeSource, /readUInt32BE\(input\)/);
  assert.match(runtimeSource, /readUInt32LE\(input\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetNumChannels\(player, numChannels\)/);
  assert.match(nativeSource, /criAtomExPlayer_SetSamplingRate\(player, samplingRate\)/);
  const format = nativeSource.indexOf("criAtomExPlayer_SetFormat(player");
  const channels = nativeSource.indexOf("criAtomExPlayer_SetNumChannels(player");
  const rate = nativeSource.indexOf("criAtomExPlayer_SetSamplingRate(player");
  const file = nativeSource.indexOf("criAtomExPlayer_SetFile(player");
  const start = nativeSource.indexOf("criAtomExPlayer_Start(player)", file);
  assert.ok(format >= 0 && format < channels && channels < rate && rate < file && file < start);
});

test("CRI waits for asynchronous STOP before replacing a file and loops retained file sources", () => {
  assert.match(nativeSource, /CRIATOMEXPLAYER_STATUS_STOP/);
  assert.match(nativeSource, /Timed out waiting for CRI player STOP/);
  assert.match(nativeSource, /status == CRIATOMEXPLAYER_STATUS_PLAYEND && gLoopEnabled\[channel\]/);
  assert.match(nativeSource, /SetDataRequestCallback\(player, nullptr, nullptr\)/);
});

test("CRI server pump advances at a frame-rate cadence for the six player channels", () => {
  assert.match(nativeSource, /chrono::milliseconds\(16\)/);
  assert.match(nativeSource, /six isolated players and a 60 Hz server pump/);
  assert.match(nativeSource, /CriAtomExPlayerHn gPlayers\[kChannelCount\]/);
});
