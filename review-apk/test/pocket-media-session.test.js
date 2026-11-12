import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const directorSource = readFileSync(new URL("../web/src/pocket-audio-director.js", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const runtimeSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketCriAudioRuntime.java", import.meta.url), "utf8");
const nativeSource = readFileSync(new URL("../app/src/main/cpp/cri_audio_jni.cpp", import.meta.url), "utf8");
const manifestSource = readFileSync(new URL("../app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
const receiverSource = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketMediaActionReceiver.java", import.meta.url), "utf8");

test("Android media controls operate the exact Settings vinyl player", () => {
  assert.match(mainSource, /mediaControl\(command, value\)[\s\S]*?audioDirector\.handleMediaControl\(command, value\)/);
  assert.match(directorSource, /case "play": return mediaPlay\(\)/);
  assert.match(directorSource, /case "pause": return mediaPause\(\)/);
  assert.match(directorSource, /case "previous": return selectRelativeTrack\(-1\)/);
  assert.match(directorSource, /case "next": return selectRelativeTrack\(1\)/);
  assert.match(runtimeSource, /new MediaSession\(activity, "Merzkava Pocket Vinyl"\)/);
  assert.match(runtimeSource, /Notification\.MediaStyle/);
  assert.match(runtimeSource, /METADATA_KEY_DURATION, duration/);
  assert.match(runtimeSource, /ACTION_SKIP_TO_NEXT/);
  assert.match(receiverSource, /PocketCriAudioRuntime\.dispatchMediaCommand/);
  assert.match(manifestSource, /\.PocketMediaActionReceiver/);
  assert.doesNotMatch(runtimeSource, /new MediaPlayer|SoundPool/);
});

test("Media notification duration and progress come from CRI and the source audio headers", () => {
  assert.match(runtimeSource, /long sampleCount = readUInt32BE\(input\)/);
  assert.match(runtimeSource, /dataBytes \/ Math\.max\(1L, channels \* 2L\)/);
  assert.match(runtimeSource, /nativeGetTime\(CHANNEL_MUSIC\)/);
  assert.match(nativeSource, /criAtomExPlayer_GetTime\(gPlayers\[channel\]\)/);
  assert.match(runtimeSource, /mediaPositionBaseMs \+ elapsed/);
  assert.match(runtimeSource, /putLong\(MediaMetadata\.METADATA_KEY_DURATION, duration\)/);
});
