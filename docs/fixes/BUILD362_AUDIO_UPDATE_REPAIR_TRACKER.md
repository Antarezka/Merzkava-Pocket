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

## Active updater design — Android notifications only

The user explicitly corrected the UI requirement: the updater belongs in the **Android device notification shade**, not inside a Pocket Settings/app panel.

### Changes made

- Removed the entire `data-update-section` Settings panel from `review-apk/web/src/main.js`.
- Removed `mountPocketUpdateSettings`, its click handlers, panel renderer, and now-unused panel state. Automatic update checks remain on Pocket startup and native resume; when a newer release exists, Pocket posts the native Android update notification.
- The foreground/native notification already contains a custom `DOWNLOAD UPDATE` action wired to `MainActivity.ACTION_DOWNLOAD_UPDATE`. Its fallback copy now explicitly tells the user to tap that device notification.
- Fixed the periodic background `PocketUpdateWorker` notification: it now carries verified release URL, APK filename, SHA-256 and build number in a notification PendingIntent, with a visible `DOWNLOAD UPDATE` action. It no longer instructs the user to open a Pocket Settings updater panel.
- Tapping the notification action reaches `MainActivity.handleUpdateNotificationIntent`, which starts the existing validated DownloadManager flow. `PocketUpdateProgressService` continues to own the device notification during download and exposes `VERIFY & INSTALL` after successful download or `TRY AGAIN` on failure.
- Build/manifest checks remain: only a strictly newer release is offered; trusted GitHub release URL, APK identity and SHA-256 are validated; installer handoff verifies the downloaded APK hash.
- JS update-check callback wait remains bounded at 45 seconds. A missing callback cannot leave the internal busy flag stuck. This logic is now notification-only; there is no app updater panel to refresh.
- Build #362 is still the current public release as last checked. An installed Build 362 should therefore receive no “new version” notification until a later release exists. The absence of a Download action before a newer release is published is intentional.

### TV pull-cord reversion confirmation

A previous attempt temporarily raised updater-card z-index and added touch-target CSS. The user rejected modifying the TV pull-cord or changing anything else to solve the updater issue. Those updater hit-layer changes have been reverted. The active branch's complete `review-apk/web/src/styles.css` now has the exact same blob SHA as the Build 362 baseline branch: `453e7bfae1906953f294e11421f36a2b8b492ac6`. Thus there are **no remaining CSS changes at all**, including no changes to the TV pull-cord's layout, hit area, z-index, or gesture styling. The TV pull-cord JavaScript/gesture implementation was not changed.

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
