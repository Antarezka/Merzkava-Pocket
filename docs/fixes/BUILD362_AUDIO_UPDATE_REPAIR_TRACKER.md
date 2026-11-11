# Build 362 Audio + Updater Repair Tracker

Last reviewed: 2026-11-11
Repository: Antarezka/Merzkava-Pocket

## Branch map (do not conflate these)

| Branch | Role | Known revision |
|---|---|---|
| `feat/pocket-audio-architecture-2026-11-11` | Source branch that produced public Build #362 | `ba40815d9ef883e72243f8881dcedfea679b2276` |
| `fix/cri-single-track-bootstrap-2026-11-11` | Earlier CRI bootstrap/streaming investigation; ancestor of the Build 362 source branch | `d9d48b2d3913c3e404455ac7d68b02f7a44c0a56` |
| `fix/build362-audio-update-2026-11-11` | ACTIVE repair branch for the next Pocket APK after audio and updater fixes | Created from Build 362 commit `ba40815d9ef883e72243f8881dcedfea679b2276` |

The first and second refs are diagnostic/source history. Continue work on the ACTIVE repair branch unless a later tracker update explicitly changes it. Do not start the repair from `main`, a stale feature branch, or the earlier bootstrap branch. Build 362's active source branch is 31 commits ahead of the bootstrap branch.

## Build 362 baseline

- Public release: `pocket-build-362`
- APK: `Merzkava-Pocket-Build-362-ba40815.apk`
- Android workflow run: #362, run ID `42927695114`
- Build job completed successfully, including ADX asset encoding, npm tests, web build, Java/native compilation, APK signature/package checks, release publication and artifact upload.
- CI success is not physical-device audio acceptance. No claim is made that Build 362 passed real-device listening or touch tests.
- Reported device symptoms to reproduce: BGM/audio, SFX and ambience all sound broken/distorted; in-app update control is not responding to taps.

## CRI source facts observed in Build 362

- One native `PocketCriAudioRuntime` is used. There are six dedicated CRI AtomEx players:
  - 0 MUSIC
  - 1 vinyl ambience/crackle
  - 2 stylus
  - 3 record placement
  - 4 door chime
  - 5 door rattle
- BGM and vinyl ambience are file streams started with `criAtomExPlayer_SetFile`; the JNI loop-monitor thread checks for `PLAYEND` every 16 ms and calls `criAtomExPlayer_Start` again for looping.
- D-BAS is created before playback with `max_streams = 6` and `max_bps = criAtom_CalculateAdxBitrate(2, 48000) * 6`.
- The ADX streaming voice pool has six voices; each audio file is converted in CI to ADX at 48 kHz. Imported user audio uses a separate PCM-WAV streaming pool.
- Android initialization uses `criAtomEx_SetDefaultConfig_ANDROID` and does not override Android output-buffer settings in this source. The Unity plugin's official Android guide documents device-specific decoder-buffer problems; its documented defaults are 133 ms output buffering and 100 ms start buffering for its corresponding Android config. Pocket is a native C++ target, not Unity: inspect the exact fields in the pinned Native SDK Android header before applying any equivalent setting; do not copy Unity property names blindly.
- CRI's thread-model manual states that MULTI runs the periodic server process on CRI-created threads, while SINGLE/USER_MULTI require application calls to `criAtomEx_ExecuteMain`. The current native code intentionally does not run a second manual pump. The source comment says Android defaults to MULTI, but the test should inspect/assert the actual `config.thread_model` value after `criAtomEx_SetDefaultConfig_ANDROID` rather than trusting a comment.
- Three user gain controls are exposed: music 68%, ambience 34%, effects 76%; master gain defaults to 100%. These per-player values alone do not prove the aggregate mix has enough headroom.
- Logical buses are implemented as per-player gain groupings; source does not contain Atom Craft authored ACF/ACB/AWB Category data or a DSP master compressor/limiter.

## Japanese CRI documentation cross-check

Use the official Japanese CRI pages as the main technical authority:

- Noise/distortion troubleshooting: https://game.criware.jp/manual/native/adx2/latest/criatom_trblsht_noise.html
  - Explicit causes: mixed level exceeding 1.0f and clipping; excessive simultaneous voice/effect load; audio-thread scheduling/priority contention; insufficient streaming buffers.
  - Recommended checks: voice/category limits, master DSP compressor/limiter, gain adjustments, audio-thread priority/CPU contention, D-BAS max_bps.
- D-BAS sizing: https://game.criware.jp/manual/native/adx2/latest/criatom_library_atomdbas.html
  - Buffer size depends on max_streams and max_bps. Set values for the worst simultaneous streaming scene and ensure device read performance can sustain the configured bitrate.
- Streaming concurrency and loader sizing: https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_maxstream.html
- Thread model: https://game.criware.jp/manual/native/adx2/latest/structCriAtomExConfigTag.html
  - MULTI runs periodic server processing on CRI-created threads. SINGLE and USER_MULTI require the app to call ExecuteMain at server_frequency. Under MULTI, do not add a second ExecuteMain pump.
- Loop authoring: https://game.criware.jp/manual/native/adx2/latest/craftv2_tips_decide_loop.html
  - For BGM, prefer waveform-embedded loop points, Atom Craft material loop settings, or documented seamless concatenation. Repeatedly waiting for PLAYEND and restarting a streamed file is not the preferred seamless BGM loop design.
- SetFile streaming/player behavior: https://game.criware.jp/manual/native/adx2/latest/group__ATOMEXLIB__PLAYER.html
- Categories, gain, priority, limits, pause/stop and ACF/ACB relationship: https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_category.html
- Queue/voice limit guidance: https://game.criware.jp/manual/adx2_tool/latest/criatom_tools_atomcraft_cue_limit_and_priority.html

Japanese developer-practice references:
- Harvestella sound implementation talk (Game Makers): https://gamemakers.jp/article/2024_04_22_66374/
  - Uses explicit voice priority policies and category-based ducking to keep voices intelligible without simply raising total mix gain.
- CRI ADX2 project-team guidance: https://criware.info/howtoadx2_201001/
  - Keep one runtime initialized across scene changes; avoid duplicate initialization/finalization; plan BGM/SE gains and loudness ceiling together with ACF/ACB/AWB data.
- Japanese ADX2 user community wiki (Sound Help / ADX2 user help group): https://w.atwiki.jp/soundtasukeai/pages/22.html
  - Its Android notes describe device-dependent output/resampling and latency caveats; its loop notes recommend material-level loop points for sample-accurate looping.
- Japanese community game-sound tuning notes: https://w.atwiki.jp/soundtasukeai/pages/45.html
  - Recommends BGM voice priority, category/queue limits for SFX, REACT ducking to lower BGM while SFX plays, and a Main Out limiter when the combined mix is too loud. This is community-authored practical guidance, not a substitute for current CRI API documentation.
- Japanese ADX2 user note on BGM being stopped: https://w.atwiki.jp/soundtasukeai/pages/49.html
  - Describes voice-pool exhaustion and voice priority as a cause of long-running BGM being stopped by later sounds. Pocket has one dedicated player per channel and six ADX voices for six players, so verify actual active voice counts before treating this as the cause.
- CRI Android device/OS caveats: https://game.criware.jp/manual/unity_plugin/latest/contents/cri4u_tgtspc_android_noize_spc020.html
  - CRI documents terminal/OS-specific ADX pop/noise reports. Treat this as a reason to record device/OS and compare outputs, not as proof of a Tecno-specific defect.

## Working diagnosis (hypotheses, not yet device-confirmed)

1. Aggregate clipping/headroom is a leading hypothesis because all sound groups can overlap, master gain is 100%, and there is no authored master limiter in the source. Test isolated BGM, isolated ambience, isolated SFX, then controlled combinations; capture true peak/output level and native error/status logs.
2. Stream underrun remains a leading hypothesis. Inspect D-BAS sizing and actual active stream count/bitrate; add diagnostics for buffer amount/stream status and audio-thread scheduling. CRI's Android-specific Unity guide says some devices need larger output decoder buffers than defaults; test the native SDK's equivalent Android settings on the target phone. Do not raise max_bps blindly beyond device storage/read capability.
3. Loop discontinuity is a separate known architectural weakness. Current PLAYEND -> Start restarts a SetFile stream. Move BGM and ambience loops to CRI-supported waveform loop points or authored Cue/Material loop metadata; preserve loop intent without competing app-side audio engines. Use seamless concatenation only where appropriate.
4. Check the Android audio thread priority and native scheduling under device load. Avoid blocking/long mutex holds around real-time work; separate diagnostics/control scheduling from CRI's own MULTI server processing.
5. Do not treat a successful APK compile or source-text tests as proof of clean audio.

## In-app updater source observations

- Settings renders a `<details data-update-section>` with a `summary`, plus `CHECK AGAIN`, `DOWNLOAD UPDATE`, and `INSTALL UPDATE` buttons.
- `mountPocketUpdateSettings()` attaches click listeners to all three buttons when the Settings route renders.
- The check action calls `checkPocketUpdates(false)`, which invokes the native `checkPocketUpdate(requestId)` bridge and expects `PocketNativeCallbacks.updateCheck`.
- The download control is intentionally hidden/disabled unless the remote manifest reports a build number newer than the installed build. Build 362 is currently the latest public release and the public manifest is for Build 362. Therefore an installation of Build 362 should not show an enabled DOWNLOAD UPDATE button until a newer release exists. `CHECK AGAIN` should remain available.
- The source check has not established why the user-reported tap is not registering. The check handler is attached, native bridge method exists, and the HTTP fetch uses 10 s connect / 12 s read timeouts. CSS inspection found no broad pointer-events blocker on the Update card; the card pseudo-border explicitly has `pointer-events:none`. The global pull-cord handle is a small fixed touch target and could overlap a scrolled control only if their screen rectangles coincide; verify on device rather than assuming it is the cause.
- Add DOM-level mount/click tests, log event receipt and native bridge dispatch, verify touch target/overlay/scroll state on device, and display a visible error if the native check callback fails or times out. Do not call the hidden download button a broken handler when there is no newer build available.

## Active repair changes (2026-11-11)

User clarified the highest-priority audio symptom: **BGM is still distorted when it is the only active sound**, with ambience/SFX at 0 and at both low and high volume. This supersedes aggregate-mix clipping as the primary diagnosis. A limiter or lower slider value alone is not an adequate repair for that symptom.

### Native audio changes now on the ACTIVE branch

- Packaged ADX assets (BGM, vinyl ambience, stylus, record placement and door effects) are loaded once into a bounded native memory cache and played with `criAtomExPlayer_SetData`, not `SetFile` streaming.
- The ADX voice pool is now configured for non-streaming/memory playback. Buffers remain cached until after `criAtomEx_Finalize_ANDROID`; CRI retains the data pointer, so freeing/replacing a buffer before AtomEx finalization would be unsafe.
- Bundled ADX loops use `criAtomExPlayer_SetDataRequestCallback` and `criAtomPlayer_SetPreviousDataAgain` to repeat the same memory buffer seamlessly. The callback only performs the permitted repeat call and an atomic counter increment; it does not take the runtime mutex, log, allocate, or read files.
- The 16 ms PLAYEND monitor is retained only for imported PCM-WAV streaming loops. It no longer owns packaged BGM/ambience loop restarts.
- D-BAS is sized for the single imported WAV streaming voice: max stream count 1 and max bitrate 6,144,000 bits/s (192 kHz × 2 channels × 16-bit PCM). Built-in ADX no longer consumes D-BAS streaming capacity.
- No Native SDK Android output-buffer value has been guessed or copied from the CRI Unity plugin guide. That guide's Android findings remain a diagnostic reference only; Native SDK 2.31.01's actual Android header/configuration must be checked separately before touching output buffering.

### Updater changes now on the ACTIVE branch

- Update summary and action controls are explicitly tappable and the Update panel is layered above the fixed pull-cord TV hit target (panel z-index 31; pull-cord layer z-index 30).
- `CHECK AGAIN` now has a 45-second JavaScript-side timeout in addition to the native HTTP timeouts. A lost callback cleans up the pending callback, shows a timeout/error status and resets the busy flag so the button is not left disabled forever.
- Update-check cancellation no longer calls the player-identity cancellation bridge. The download button remains hidden until a newer release actually exists; this is intentional on Build 362 while Build 362 remains latest.

### Automated checks

- Test-only workflow: `.github/workflows/pocket-repair-tests.yml`. It runs the full npm suite and syntax checks, plus a native compile-only job against the pinned CRI ADX LE SDK 2.31.01.
- First test-only run: `42934018372` — success for JavaScript syntax and the full Pocket test suite.
- Second test-only run after adding JNI compile: `42934099545` — check latest job results before claiming native compilation passed.
- These jobs do not run `assembleDebug`, sign an APK, create a release, or publish an update.

The memory playback change removes storage streaming and file-loop restart from the bundled ADX playback path. It does **not** prove the original BGM source is clean or rule out Android output/decode/resampling distortion. Real-device listening remains required, especially with the reported BGM-only case. If that still distorts, next inspect the actual Native SDK Android output-buffer configuration and decoded ADX PCM peak/waveform on the target device rather than applying a master limiter blindly.

## Required acceptance checks before the next APK build

1. Confirm the latest `pocket-repair-tests.yml` run passes both full npm tests and native CRI SDK compile-only job.
2. On the real target phone, test one built-in BGM alone at low/medium/high gain; compare speaker and wired/Bluetooth headphones. Verify no clicks or distortions across a full loop.
3. Test vinyl ambience alone, each SFX alone, then BGM+ambience and all supported overlaps. Confirm loop continuity and channel separation.
4. If single-stream BGM is still distorted after in-memory playback, decode the exact packaged ADX to PCM and inspect peak/clipping and waveform against the restored OGG; then inspect Native SDK 2.31.01 Android output-buffer/resampling configuration and device audio scheduling. Do not copy Unity plugin fields/defaults without a matching Native SDK field.
5. Verify the imported PCM-WAV stream at the highest accepted 192 kHz stereo format and confirm D-BAS buffer sufficiency on the target device.
6. On installed Build 362, tap the Update summary and CHECK AGAIN at different scroll positions; verify hit target, native request, callback/timeout feedback, and that the button becomes enabled again after completion. Confirm DOWNLOAD UPDATE is hidden when no newer release exists.
7. Do not run/publish the next Android APK build until the user explicitly approves the build.

## Handoff instruction

Next AI: start by reading this file, then inspect the ACTIVE repair branch. Keep the three branch names above intact in notes and PR descriptions. The ACTIVE repair branch was created from the Build 362 commit and is not currently in the automatic APK push-trigger list; use workflow_dispatch only after the repair is complete and the user explicitly approves a build. Do not claim physical-device acceptance without an actual device test.
