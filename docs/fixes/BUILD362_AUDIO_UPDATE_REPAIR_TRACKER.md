# Build 362 Audio + Device Notification Repair Tracker

Last reviewed: 2026-11-11
Repository: Antarezka/Merzkava-Pocket
Active branch: `fix/build362-audio-update-2026-11-11`

## Branch map

| Branch | Role | Reference |
|---|---|---|
| `feat/pocket-audio-architecture-2026-11-11` | Source branch that produced public Build #362 | `ba40815d9ef883e72243f8881dcedfea679b2276` |
| `fix/cri-single-track-bootstrap-2026-11-11` | Earlier CRI bootstrap/streaming investigation; ancestor of the Build 362 branch | `d9d48b2d3913c3e404455ac7d68b02f7a44c0a56` |
| `fix/build362-audio-update-2026-11-11` | Active repair branch for the next Pocket build | Created from Build 362 source commit `ba40815d9ef883e72243f8881dcedfea679b2276` |

Do not conflate these branches. Continue on the active repair branch. It is not included in the APK build workflow's automatic push-trigger allow-list; the only build workflow path is `workflow_dispatch`, and it must not be dispatched until the user explicitly approves an APK build.

## Build 362 baseline

- Public release: `pocket-build-362`
- APK: `Merzkava-Pocket-Build-362-ba40815.apk`
- Android workflow run: #362, run ID `42927695114`, source commit `ba40815d9ef883e72243f8881dcedfea679b2276`.
- CI previously passed ADX conversion, tests, web/native compilation, APK signature/package checks, release publication and artifact upload.
- CI success is not physical-device acceptance. No listening/touch acceptance test on the user's Tecno device has been performed in this repair.

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

This architecture change is a reasoned attempt to remove disk-stream underruns and file-loop restart gaps. It does **not** prove the source track is clean or that playback is fixed on the actual device.

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
- Build #362 remains the current public release as last checked. An installed Build 362 should not show an enabled Settings Download button until a newer release exists. This is expected; when a new build exists, the button becomes visible and enabled.

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

## Automated checks and build restrictions

Test-only workflow: `.github/workflows/pocket-repair-tests.yml`.
- Runs Node syntax checks and the full `npm test` suite.
- Separately downloads/verifies the pinned private CRI ADX LE SDK 2.31.01 and compiles Pocket JNI + Java sources for ARM64 and ARMv7.
- It does not run `assembleDebug`, sign an APK, create a GitHub release, or publish an app update.
- Latest known workflow run after the notification-only change is run #8, ID `42935679886`, commit `0da277d2c9e228d48da1487cd5f527149d860d7a`. It was in progress when inspected; re-check it. A later commit removing unused JS state may have triggered another run.
- Earlier run #6, ID `42934255046`, passed both npm tests and native compile-only checks for ARM64 and ARMv7 on the preceding audio-only revision. This confirms SDK API/header compatibility at that revision, not device sound quality.

Do not build/publish the next APK until:
1. Test-only workflow passes on the latest head (full JS tests plus native/Java compile).
2. Real-device listening confirms isolated BGM at low/medium/high gain and through a full loop; test ambience and each SFX alone and in intended combinations.
3. If isolated BGM still distorts, compare decoded source OGG and packaged ADX PCM; inspect peak/clipping and Native SDK Android output/resampling configuration. Do not blindly add a limiter or copy Unity buffer fields.
4. Real device verifies system notification appears, DOWNLOAD UPDATE works, DownloadManager progress notification appears, VERIFY & INSTALL appears on completion, and the APK hash is checked.
5. Do not claim physical-device acceptance without testing.

**Never trigger the APK build workflow without the user's explicit approval.** The user has not approved the next APK build.
