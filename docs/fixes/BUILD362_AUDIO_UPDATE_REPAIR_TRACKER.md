# Build 362 Audio + Device Notification Repair Tracker

Last reviewed: 2026-11-11
Repository: Antarezka/Merzkava-Pocket
Active follow-up branch: `fix/build378-cri-default-renderer-2026-11-11`

## Branch map

| Branch | Role | Reference |
|---|---|---|
| `feat/pocket-audio-architecture-2026-11-11` | Source branch that produced public Build #362 | `ba40815d9ef883e72243f8881dcedfea679b2276` |
| `fix/cri-single-track-bootstrap-2026-11-11` | Earlier CRI bootstrap/streaming investigation; ancestor of the Build 362 branch | `d9d48b2d3913c3e404455ac7d68b02f7a44c0a56` |
| `fix/build362-audio-update-2026-11-11` | Active repair branch; produced final Build #368 | `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f` |
| `fix/preserve-source-audio-rate-2026-11-11` | Follow-up conversion-only fix: preserve supported source sampling rates and channel count | `28f629370c7a5da769af1b44b679c54716058031` |
| `fix/build378-cri-default-renderer-2026-11-11` | Renderer follow-up; final APK workflow run #379 restores CRI Android default renderer selection for bundled ADX | based on Build 377 `758287276ac8620816e2387634f423583cfcbc88` |
| `chore/pocket-audio-folder-2026-11-09` | CI source-asset branch for Happy/chill/Retroatrical tracks, needle drop and record placement | `0f1f6b02ce97ffd3b23113c92cc462e47c41679e` |
| `feat/settings-vinyl-player-2026-11-09` | CI source-asset branch for vinyl surface noise | `0b2eb019dd73d6caa02a41365d26f5b5e85e8257` |

The application source/repair branches are separate from the two source-asset branches, which the APK workflow reads only to restore original audio files before CRI conversion. The prior `fix/build362-audio-update-2026-11-11` branch was added to the APK workflow push allow-list and produced Build #368 from `66db2e1b3fe132c4c0397e7b02d2ee96eda96e3f`. The follow-up `fix/preserve-source-audio-rate-2026-11-11` branch is not on that allow-list, so its workflow edits do not trigger an APK build automatically.

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

## Follow-up: preserve source audio rate (not yet built)

- Active follow-up branch: `fix/preserve-source-audio-rate-2026-11-11`.
- Scope is limited to the build-time conversion step. The CRI playback runtime, native JNI path, player channels, loop handling, fades, and UI are unchanged.
- The previous pipeline forced every source to 48,000 Hz. The follow-up preserves the original rate whenever it is supported by CRI ADX: 48,000; 44,100; 32,000; 24,000; 22,050; 16,000; 12,000; 11,025; or 8,000 Hz. Unsupported rates are mapped to the nearest supported rate, with a 48 kHz ceiling.
- Mono and stereo are preserved as mono and stereo. Sources wider than stereo are downmixed to stereo because Pocket's current ADX playback metadata contract is mono/stereo.
- The sample-count timestamp reset remains in place to avoid the earlier non-monotonic DTS issue. Build validation now checks the generated ADX sample rate and channel count against the selected target values, and logs source/output codec, rate, channels, layout, sample format, raw bit depth, and bitrate.
- Codec remains ADX and the runtime remains unchanged. CRI documents ADX as 1/4 compression with ADPCM-equivalent quality; high, bright frequencies can be more visibly degraded. This is a separate quality limit from resampling and is not changed in this rate-only correction.
- Local FFmpeg smoke checks passed for 44.1 kHz stereo, 48 kHz mono, and a 96 kHz stereo source mapped down to 48 kHz; each encoded ADX decoded successfully and preserved the expected target channels.
- No APK was built from this follow-up branch. Build #368 remains the last public build until a new build is explicitly approved and the resulting CI logs confirm the real source metadata.

## User-reported issue and key diagnostic clarification

The user reported distortion/crackling across BGM, ambience and SFX. They then clarified that **BGM is still distorted while it is the only active sound, with ambience/SFX at 0 and both low and high volume**. This makes aggregate mix clipping a secondary concern, not the primary explanation for the isolated-BGM defect. Do not suggest that reducing gain or adding a master limiter alone fixes it.

## Build 377 APK inspection and Build 379 renderer isolation

- Build 377 workflow run: #377, ID `42964827788`, source commit `758287276ac8620816e2387634f423583cfcbc88`.
- Build 377 artifact ZIP SHA-256: `8781dda5aa191d8ace6b1ac91b46c633fd3097b80b226aaf0df320c9fd4a796a`.
- Inspected APK: `Merzkava-Pocket-Build-377-7582872.apk`, SHA-256 `abdafc6f884c2466c542aa40834a20a47fa8ced5000e9238c8d754b1d27cce17`.
- All seven packaged ADX files report 44,100 Hz stereo and decode successfully with FFmpeg. The decoded BGM sample peaks are 0.516–0.629 of full scale; none of the seven files has samples at or above 32760/32768. This rules out obvious full-scale digital clipping in the packaged PCM decode, but does not prove playback is clean on the handset or rule out codec/perceptual artifacts.
- Build 377 explicitly forced `CRIATOM_SOUND_RENDERER_NATIVE` for the ADX voice pool. The matching CRI Native API reference documents the ADX-player default as `CRIATOM_SOUND_RENDERER_DEFAULT`, distinguishes DEFAULT from NATIVE (platform output) and ASR (CRI software renderer), and describes ASR resampling/mixing. The Wave pool already retains the CRI default. The explicit Native override was therefore an unnecessary renderer-path divergence.
- The final Build 379 run removes only that forced renderer assignment and preserves CRI's default selection for bundled ADX, matching the Wave pool's default selection. It does not change ADX assets, sample rates, channels, gain calculations, Tween fades, thread model, loop callback, D-BAS, import handling, UI, turntable behavior, or updater.
- No Native SDK Android buffer field or Unity-plugin buffering number was guessed. The Unity Android guide's 133/100 ms settings are Unity-plugin settings, not automatically transferable to Pocket's Native SDK.
- Device listening is still the acceptance test. Build/compile checks cannot establish that the sound is clean on the Tecno device.

## Build 379 distortion elimination (follow-up branch `fix/build379-cri-distortion-2026-11-11`)

Reported state: Build 379 (default renderer restored) still sounds distorted. Method: eliminate variables one by one, using the build history above and measurements of the shipped assets.

| Variable | Builds that changed it | Result |
|---|---|---|
| ADX asset integrity (header, decode, clipping, DC offset) | 372 bundled the supplied ADX directly | Eliminated. All seven files: ADX v3, 4-bit, 44.1 kHz stereo, 500 Hz predictor cutoff, decode OK. Peaks 0.52-0.63 (BGM), zero samples at full scale, DC offset below 0.0002. |
| Codec damage vs. source OGG | 372 | Eliminated as a gross fault. Decoded ADX vs. source OGG: SNR 28-36 dB overall; error is below the music in every band up to 16 kHz and only reaches parity above 16 kHz. This is ordinary 4-bit ADX quantisation, not corruption. |
| Mix clipping / gain | n/a | Eliminated. Isolated BGM already distorted (tracker note above) and decoded peaks stay under 0.63. |
| 48 kHz resample / timestamps | 362-368 vs. 371+ | Eliminated. Sample rate and channels in the header match what `SetSamplingRate` / `SetNumChannels` receive; the voice pool allows up to 48 kHz stereo. |
| Streaming vs. in-memory ADX, loop restarts | 359 vs. 362 | Eliminated per the tracker: distortion persisted after the move to memory playback and callback loops. |
| Second server pump | 360 | Eliminated: no `criAtomEx_ExecuteMain` and no manual pump in the source. |
| Forced NATIVE renderer | 377 vs. 379 | Eliminated as the sole cause: 379 restored the default and is still distorted. |
| Android output configuration | never changed in any build | Remaining candidate. |

Never varied in any build, and therefore not yet eliminated:

- The SDK helper `criAtomEx_SetDefaultConfig_ANDROID` selects `CRIATOMEX_THREAD_MODEL_MULTI_WITH_SONICSYNC` (`cri_le_atom_android.h` line 110). Earlier notes assumed plain MULTI. `cri_le_atom_ex.h` says SONICSYNC behaves like MULTI only in some conditions, so which behavior a handset actually gets was never pinned down.
- `criAtom_SetSoundStartBufferingTime_ANDROID` and `criAtom_SetSoundBufferingTime_ANDROID` were never called. The SDK header states that on some Android handsets a small start-buffering time or a small sound-decode buffer causes noise.
- `criAtom_ApplyHardwareProperties_ANDROID` was never called, so the native renderer had no device output properties.

Change in this branch (native init only; assets, runtime, UI, updater unchanged):

- Pin `config.atom_ex.thread_model = CRIATOMEX_THREAD_MODEL_MULTI` right after the Android defaults.
- Call `criAtom_ApplyHardwareProperties_ANDROID` with the application Context (new `nativeInit(Context)` parameter), then set start buffering 200 and buffering 400 before `criAtomEx_Initialize_ANDROID`.
- Logcat line `Android output tuning: hardwareProperties=... startBuffering=...ms buffering=...ms` records what was applied.

Confirmed from the SDK's own header text (printed in the Build 380 log, step "Print CRI Android buffering and thread-model documentation"):

- Both buffering functions take milliseconds, and both must run before initialization.
- SDK defaults are about 50 ms start buffering (3 server ticks) and about 66 ms decode buffer (4 server ticks) at a 60 fps server frequency. The header says these small amounts can cause noise on some Android handsets and that raising them can fix it. Larger values add playback-start latency.
- `criAtom_ApplyHardwareProperties_ANDROID` applies the device's output sample rate so the OpenSL ES layer runs at the handset's own rate, which reduces playback load. It returns CRI_FALSE on low API levels and then the defaults stay in effect.

Open points that must be confirmed rather than assumed:

- The 200 / 400 ms values are Pocket's own first step (about 4x and 6x the SDK defaults), not SDK-recommended numbers. If the stylus drop or the first note of a record feels late, lower them; if distortion remains, raise them before moving to the PCM arm.
- Unity-plugin figures (133 / 100) are not transferable to the Native SDK and were not used.
- Device listening on the target phone is still the only real acceptance test. If the sound is still distorted with this change, the next elimination arm is the existing `fix/toolster-adx-pcm-decode-2026-11-11` branch (decode ADX to PCM16 in Java and play through the CRI Wave pool), which bypasses CRI's ADX decoder entirely.

References for this renderer decision:
- CRI Native ADX player configuration and renderer semantics: https://game.criware.jp/manual/native/adx2_en/latest/structCriAtomAdxPlayerConfigTag.html
- CRI ASR resampling and rendering behavior: https://game.criware.jp/manual/native/adx2_en/latest/criatom_library_atomasr.html
- CRI native noise troubleshooting: https://game.criware.jp/manual/native/adx2/latest/criatom_trblsht_noise.html

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

