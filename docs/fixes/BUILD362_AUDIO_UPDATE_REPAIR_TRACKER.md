# Build 362 Audio + Device Notification Repair Tracker

Last reviewed: 2026-11-11
Repository: Antarezka/Merzkava-Pocket
Active branch: `fix/build362-audio-update-2026-11-11`

## Branch map

| Branch | Role | Reference |
|---|---|---|
| `feat/pocket-audio-architecture-2026-11-11` | Source branch that produced public Build #362 | `ba40815d9ef883e72243f8881dcedfea679b2276` |
| `fix/cri-single-track-bootstrap-2026-11-11` | Earlier CRI bootstrap/streaming investigation; ancestor of the Build 362 branch | `d9d48b2d3913c3e404455ac7d68b02f7a44c0a56` |
| `fix/build362-audio-update-2026-11-11` | Active repair branch; produced final Build #368 | `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f` |
| `chore/pocket-audio-folder-2026-11-09` | CI source-asset branch for Happy/chill/Retroatrical tracks, needle drop and record placement | `0f1f6b02ce97ffd3b23113c92cc462e47c41679e` |
| `feat/settings-vinyl-player-2026-11-09` | CI source-asset branch for vinyl surface noise | `0b2eb019dd73d6caa02a41365d26f5b5e85e8257` |

The first three are the application source/repair history. The final two are referenced by the APK workflow only to restore original audio source files before converting them to CRI ADX; they are not merged into the app source. The active repair branch was added to the APK workflow push allow-list. Build #368 was produced from this branch's final head SHA `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f`.

## Build 362 baseline

- Public release: `pocket-build-362`
- APK: `Merzkava-Pocket-Build-362-ba40815.apk`
- Android workflow run: #362, run ID `42927695114`, source commit `ba40815d9ef883e72243f8881dcedfea679b2276`.
- CI previously passed ADX conversion, tests, web/native compilation, APK signature/package checks, release publication and artifact upload.
- CI success is not physical-device acceptance. No listening/touch acceptance test on the user's Tecno device has been performed in this repair.

## Final repair build #368

- Final release tag: `pocket-build-368`
- Release page: https://github.com/Antarezka/Merzkava-Pocket/releases/tag/pocket-build-368
- APK: `Merzkava-Pocket-Build-368-66db2e1.apk` (47,596,135 bytes)
- APK URL: https://github.com/Antarezka/Merzkava-Pocket/releases/download/pocket-build-368/Merzkava-Pocket-Build-368-66db2e1.apk
- APK SHA-256: `d6958d0b0917737b3fa26f01259d859c89440f833bb50da47868ee8f85ca15ec`
- Full build workflow: run #368, ID `42938533121`, commit `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f`, conclusion `success`.
- Repair test workflow: run #18, ID `42938533078`, same commit, both JS/unit tests and native/Java compile jobs `success`.
- Actions ZIP artifact: `Merzkava-Pocket-Build-368-66db2e1`, artifact ID `13820031082`, 41,803,674 bytes.
- ZIP SHA-256: `772b2577f8ee39565d2c087a81241ad34ac15de7b35b17d7436e8843b256a7c5`.
- The ZIP contains the APK plus `merzkava-pocket-shimaenaga.png` and `merzkava-pocket-shimaenaga.ico`.
- Build #368's log contains zero `non monotonically increasing dts` warnings. All nine packaged ADX tracks reported `48000 Hz | decode OK`. Web build, all 46 npm tests, native-only CRI source checks, Java/JNI compile, APK assembly, signature/package verification, release publication and artifact upload all completed successfully.
- Intermediate history: #363 failed on a false-negative literal grep contract; #364 succeeded but used the pre-timestamp-reset encode pipeline and is superseded; #365's strict decoder readback check falsely failed at the ADX tail; #366/#367 were superseded/cancelled while the readback contract was corrected. Only #368 is the final build to install.

## User-reported issue and key diagnostic clarification

The user reported distortion/crackling across BGM, ambience and SFX. They then clarified that **BGM is still distorted while it is the only active sound, with ambience/SFX at 0 and both low and high volume**. This makes aggregate mix clipping a secondary concern, not the primary explanation for the isolated-BGM defect. Do not suggest that reducing gain or adding a master limiter alone fixes it.

## CRI facts found in Build 362

- One native `PocketCriAudioRuntime` owns playback; six dedicated players: MUSIC, vinyl crackle/ambience, stylus, record placement, door chime, door rattle.
- Build 362 sends packaged ADX files through `criAtomExPlayer_SetFile` and loops by waiting for `PLAYEND`, then issuing `Start()` from a 16 ms monitor thread.
- Build 362 D-BAS has six streams and an ADX-derived bitrate allowance. Packaged ADX assets are normalized to 48 kHz by CI. Imported WAV has a separate streaming voice pool.
- Native initialization uses `criAtomEx_SetDefaultConfig_ANDROID`; Build 362 did not override Android output-buffer settings.
- CRI's thread-model manual says MULTI uses CRI-managed server threads. SINGLE/USER_MULTI require application `criAtomEx_ExecuteMain`. Do not add a second pump if Android config resolves to MULTI. Current source still relies on CRI Android's default MULTI model; a future diagnostic should log/assert the actual config field if the SDK header exposes it.
- Logical channel gain controls are per-player groupings, not authored Atom Craft ACF/ACB Categories. No project-authored master DSP limiter/compressor is present.

## Active audio repair changes

File: `review-apk/app/src/main/cpp/cri_audio_jni.cpp`

- Packaged ADX (BGM, ambience and built-in effects) is loaded once into a bounded native memory cache and played via `criAtomExPlayer_SetData`, rather than streamed from a file by `SetFile`.
- ADX voice pool is configured for memory/non-streaming playback. The cached bytes remain alive until after `criAtomEx_Finalize_ANDROID`; CRI retains the pointer supplied to `SetData`.
- Built-in ADX loops use the CRI data-request callback and `criAtomPlayer_SetPreviousDataAgain`. The callback performs only the repeat call and an atomic counter update; it does not take the runtime mutex, log, allocate, or read files.
- The 16 ms monitor remains for imported PCM-WAV file-stream loops only. It no longer restarts packaged BGM or ambience.
- D-BAS now serves the single imported PCM-WAV streaming voice: one stream, max bitrate 6,144,000 bits/s (192 kHz × 2 channels × 16-bit PCM).
- No Android output-buffer values were guessed or copied from CRI's Unity plugin documentation. Pocket is using the Native SDK. If isolated BGM still distorts after this change, inspect SDK 2.31.01's actual Android output/resampler config fields and compare decoded PCM of the source OGG with the packaged ADX.
- The APK build workflow now resamples to 48 kHz and applies `asetpts=N/SR/TB` before ADX muxing. This resets packet timestamps from the decoded sample count rather than carrying irregular timestamps from OGG/MP3 inputs. Encoding runs with FFmpeg `-xerror`; every encoded ADX is then decoded to a null sink, probed for 48 kHz, and checked for a successful readback.
- Build #368 converted and read back all nine packaged ADX files successfully. Its log had **zero** non-monotonic DTS warnings. The strict FFmpeg decoder `-xerror` flag is intentionally not used for readback: local reproduction showed it flags the final padding packet of generated mono ADX files even when normal decode exits successfully and produces the expected PCM duration. The encoder itself remains strict.

The in-memory CRI path plus the corrected ADX sample-clock pipeline remove two plausible sources of underrun/timestamp discontinuity. CI proves the files decode and the Android/native code compiles; it does **not** prove the sound is clean on the user's physical phone. Device listening is still required.

## Active updater design — original Settings mechanism + Android notification

The user clarified that the **existing Pocket Settings updater must remain in Settings with its original mechanism**. The notification is an additional route, not a replacement. Do not remove or redesign the Settings updater again.

### Settings updater restored

- Restored the original full `data-update-section` Settings panel and its existing information hierarchy: installed/latest build, release version and size, release notes, internal storage, download progress, `DOWNLOAD UPDATE`, `INSTALL UPDATE`, and `CHECK AGAIN`.
- Restored `refreshPocketUpdatePanel` and `mountPocketUpdateSettings` as the original Settings rendering, polling and event-binding mechanism. Settings again mounts and disposes `mountPocketUpdateSettings()` exactly as in the Build 362 source.
- The existing `DOWNLOAD UPDATE` button's click handler continues to call the existing native `startPocketUpdateDownload(apkUrl, apkName, apkSha256, buildNumber)` method, which validates the release identity and queues the APK through Android DownloadManager. The handler now checks the native method is available, reports a useful error instead of silently returning, and resets the existing button to `RETRY DOWNLOAD` if Android rejects the request. It does not create a replacement UI or a new download protocol.
- The 45-second update-check callback timeout remains to ensure `CHECK AGAIN` cannot stay disabled forever when a native callback is lost. Update-check cancellation is not routed through the unrelated player-identity cancellation bridge.
- The latest automated contract test explicitly asserts that the original Settings panel and click handler remain present and that the button calls the validated native updater.

### Android notification remains an additional path

- On startup/native resume, Pocket checks whether a newer public build exists and can post the native Android update notification.
- The native notification includes its own `DOWNLOAD UPDATE` action wired to `MainActivity.ACTION_DOWNLOAD_UPDATE`.
- The periodic background `PocketUpdateWorker` notification now also carries the validated release URL, APK filename, SHA-256 and build number in its PendingIntent, with a visible `DOWNLOAD UPDATE` action.
- Both notification routes use the same existing `startPocketUpdateDownload` / DownloadManager flow. `PocketUpdateProgressService` displays download progress and provides `VERIFY & INSTALL` after a completed download or `TRY AGAIN` after a failure.
- The installer continues to verify the downloaded APK SHA-256 before Android opens the package installer.
- Build #368 is the current final public release after this repair. An installed Build #362 (or any older build) should now see a newer build in Settings. The original Settings download button remains part of the existing updater mechanism and calls the native DownloadManager method; the Android notification is an additional route, not a replacement.

### TV pull-cord and CSS reversion confirmation

The user explicitly rejected changing the TV pull-cord or its behavior to solve the updater problem. The updater z-index/hit-layer experiment was reverted. The complete `review-apk/web/src/styles.css` is identical to the Build 362 baseline blob SHA `453e7bfae1906953f294e11421f36a2b8b492ac6`. No TV pull-cord layout, hit area, z-index, or gesture implementation was changed.


## Japanese CRI research references

Official CRI documentation:
- Noise/distortion troubleshooting: https://game.criware.jp/manual/native/adx2/latest/criatom_trblsht_noise.html
- D-BAS sizing: https://game.criware.jp/manual/native/adx2/latest/criatom_library_atomdbas.html
- Stream concurrency/file-loader sizing: https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_maxstream.html
- Thread model: https://game.criware.jp/manual/native/adx2/latest/structCriAtomExConfigTag.html
- Loop authoring: https://game.criware.jp/manual/native/adx2/latest/craftv2_tips_decide_loop.html
- AtomEx player/SetFile/SetData APIs: https://game.criware.jp/manual/native/adx2/latest/group__ATOMEXLIB__PLAYER.html
- Categories and ACF/ACB relationship: https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_category.html
- Cue limits and priority: https://game.criware.jp/manual/adx2_tool/latest/criatom_tools_atomcraft_cue_limit_and_priority.html
- Android noise caveats from the CRI Unity plugin: https://game.criware.jp/manual/unity_plugin/latest/contents/cri4u_tgtspc_android_noize_spc010.html . Cross-reference only; do not copy Unity-specific fields/defaults into Pocket Native SDK code.

Japanese developer/community practice:
- Game Makers / Harvestella sound implementation talk: https://gamemakers.jp/article/2024_04_22_66374/
- CRI ADX2 project-team guidance: https://criware.info/howtoadx2_201001/
- Japanese ADX2 user-help community: https://w.atwiki.jp/soundtasukeai/pages/22.html
- Japanese community tuning notes: https://w.atwiki.jp/soundtasukeai/pages/45.html
- Japanese user note on voice-pool exhaustion and BGM stop: https://w.atwiki.jp/soundtasukeai/pages/49.html

Community tuning material is practical corroboration, not a substitute for the matching CRI Native SDK 2.31.01 headers/reference.

## Automated checks and final acceptance status

Test-only workflow: `.github/workflows/pocket-repair-tests.yml`.
- Runs JavaScript syntax checks and the full `npm test` suite.
- Separately downloads/verifies the pinned private CRI ADX LE SDK 2.31.01 and compiles Pocket JNI + Java sources for ARM64 and ARMv7.
- Latest run #18, ID `42938533078`, commit `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f`: both the full tests and native/Java compile jobs passed.
- Earlier run #16, ID `42936485976`, passed the restored Settings updater contract and native/Java compile before the final ADX timestamp validation was added.

Final APK workflow: `.github/workflows/pocket-design-review-apk.yml`.
- Run #368, ID `42938533121`, branch `fix/build362-audio-update-2026-11-11`, final commit `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f`.
- All workflow steps completed successfully: Android SDK/NDK, pinned CRI SDK verification, FFmpeg ADX encoder, restoration of original audio sources, nine ADX encodes with sample-based PTS reset, all nine readback decodes, 48 kHz metadata checks, npm tests, native-only CRI contract checks, web shell, Java/JNI compile, APK assembly, signature/package checks, release publication and ZIP artifact upload.
- Workflow log has zero non-monotonic DTS warnings in the final build. This is a build-time audio-data integrity improvement, not proof of on-device sound quality.

## Remaining physical-device acceptance checks

1. On the target phone, play each built-in BGM alone at low/medium/high volume and listen through a full loop. Compare the phone speaker and headphones if available.
2. Listen to vinyl ambience and each SFX separately, then BGM+ambience and the supported overlap combinations.
3. Open Settings on the installed older build and confirm the original `DOWNLOAD UPDATE` button is visible/enabled for Build #368 and begins DownloadManager. Confirm the progress notification and `VERIFY & INSTALL` flow.
4. Confirm the update retains local Pocket player/settings data after installation.

No physical-device audio listening or actual touch test was available during this repair. Do not claim the distortion is eliminated until it has been heard on the target device. The current Settings updater's click handler is present, calls the validated native download method, and is covered by source-contract tests; real tap acceptance remains outstanding.

