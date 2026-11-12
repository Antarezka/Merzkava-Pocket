# Pocket Audio Architecture

## Runtime ownership

Pocket has one playback engine: CRI ADX LE. Android and WebView are command/presentation layers only; they must not create a second audio engine through MediaPlayer, AudioTrack, HTMLAudioElement, or AudioContext.

- CRI engine (PocketCriAudioRuntime + JNI): owns playback players, decoding/streaming, looping, pause/stop, player gain, and CRI Tween fades.

The Android target uses CRI's MULTI thread model. CRI owns the periodic server process on its internal high-priority thread. Pocket's native 16 ms loop-monitor thread only checks for PLAYEND and restarts BGM/ambience file streams; it must not call the CRI server-pump function. Running a second manual server pump alongside MULTI can contend with CRI's decoder/streaming work and produce broken-up or noisy output. The CRI server thread remains the only scheduler for file reads, decoding, voice updates, and audio output.
- Audio Director (pocket-audio-director.js): owns intent and policy: selected BGM, when to start the ambience bed, how native status changes affect the deck, and which CRI channels receive effects.
- Visual presentation (audio-player.js + CSS): reads the Director's stylus intent plus native CRI status and animates platter, disc, stylus, and status light. It never issues playback commands or decides what audio file to play.

## Logical routing buses

| Bus | Current CRI player channel(s) | Purpose |
|---|---:|---|
| MASTER | All channels | Global gain ceiling (engine default 100%) |
| MUSIC | 0 | Selected BGM and imported records |
| AMBIENCE | 1 | Continuous vinyl surface crackle |
| MECHANICAL | 2-3 | Stylus drop and record placement |
| UI | 4 | UI chime |
| SFX | 5 | Other short effects |
| VOICE | Reserved | Future dialogue |

Settings exposes independent Music, Vinyl Ambience, and Sound Effects levels. Sound Effects currently controls the MECHANICAL, UI, and SFX channels. Each effect channel has one CRI player, so a retrigger on that same channel replaces its prior instance; separate channels remain concurrent.

## Official and user-imported BGM

The Settings record rack includes the four original Pocket BGM tracks plus seven creator-owned **Merzkava Official Theme** ADX tracks. The Android build fetches those seven source files from the repository's root-level `main` assets and places normalized filenames under `assets/cri-audio/`; the APK contains them only in that CRI asset directory.

The Settings **Add Music** picker accepts ordinary Android-supported audio formats and CRI ADX. Ordinary formats continue to be decoded to PCM16 WAV at import. ADX is copied intact into Pocket's private music shelf, validated with `PocketAdxDecoder.inspect`, and decoded by the same `PocketAdxDecoder` PCM-cache path at playback. Both routes reach the same native CRI MUSIC player, CRI Tween fade-in/fade-out, and the same volume control. No Android MediaCodec or WebView audio playback is used for ADX.

## End-to-end startup and turntable state rules

### Boot-time audio cache preparation

- After the WebView creates the Audio Director, it asks the already initialized native runtime to warm the selected record first, followed by every bundled BGM/effect and every UUID-named imported ADX/WAV already in the local music shelf.
- This is a one-shot, low-priority task on the existing serialized PCM decoder worker. ADX sources are decoded into the same validated private PCM16 WAV cache used by playback; existing imported WAVs are metadata-checked. The opening 512 KiB of each playable WAV is read in bounded chunks to warm the initial streaming window in the operating-system file cache, without retaining a second in-memory copy; CRI streams the remainder normally.
- The initial startup playback request is queued on that same worker. It therefore waits for the boot warm-up pass to finish, then follows the normal startup sequence below. No audio starts during login or before the authenticated splash completes.
- The warm-up does not allocate extra CRI voices, add another playback engine, alter the six-channel/D-BAS configuration, change Android output-buffer tuning, or execute alongside an audible track. Failed or newly imported files still fall back to the normal per-track preparation path.
- This removes repeated ADX decoding and reduces cold file I/O during later track changes. CRI still has to attach and start the selected stream on the MUSIC player, so a short native PREP edge may remain; eliminating that edge for all records would require holding additional CRI stream/voice resources concurrently and is not enabled in this configuration.

### Startup after the authenticated splash

1. The initial boot mark/login flow does not start audible playback. The boot cache warm-up runs separately in the background.
2. After the authenticated Pocket splash animation completes, the Director requests the currently selected BGM. The request waits behind the boot cache pass when that pass is still running.
3. CRI starts MUSIC at a zero Tween multiplier and fades it up. Only after native CRI reports BGM as `playing` does the Director request the one-shot `record-placement` SFX.
4. Native playback readiness starts the platter motor and arms the stylus-contact cue. Once CRI confirms stylus contact, the Director lowers the stylus and requests the independent vinyl-crackle ambience loop.
5. The Director waits for the native CRI `record` channel to report `ended` before marking the startup sequence complete. A bounded six-second fallback after the cue starts prevents a missing completion callback from leaving startup in a pending state.
6. If BGM playback fails, the Director clears the stylus-down state and reports the CRI error. The BGM continues looping as the single current record; startup does not advance a playlist.

### Opening Settings > Audio

Opening the Audio section does not start, restart, or pause music. It mounts a visual turntable and immediately reads the current Director state. If music is already active, the platter begins its visual rotation; if paused, the stylus remains lifted and the platter remains stopped. Leaving Settings disposes only that screen's animation instance, not the CRI runtime or the selected track.

### Stylus and record interactions

- Lower stylus: the Director requests the short `stylus-drop` effect and starts or resumes the selected music.
- Lift stylus: the Director raises the stylus state immediately; CRI fades MUSIC and AMBIENCE down over about 170 ms, then applies native pause at about 185 ms. The visual platter eases to a stop.
- There is currently no separate stylus-lift one-shot asset/cue. The audible lift behavior is the shared music/ambience fade and pause, not a hidden second playback path.
- Select a record while idle: selection and sleeve-to-platter visual travel only; playback does not begin.
- Select a record while playing: only MUSIC is faded/replaced. AMBIENCE remains on its existing CRI player. The Director keeps the stylus down through the new track's PREP state so the platter does not brake between songs.
- Select a record while paused: CRI loads the new track but preserves pause; the stylus stays lifted until the user lowers it again.

### Full, mini-window, and bubble lifecycle

| Mode | CRI playback | Turntable rendering |
|---|---|---|
| Full Activity | Continues | Runs when the Audio section is mounted |
| Floating mini-window | Same Activity, WebView and CRI runtime continue | Runs in the same WebView |
| TV bubble | CRI continues; no pause/stop command is sent by the mode transition | WebView/AnimeJS and the custom platter RAF are suspended while hidden |
| Return to full / mini-window | Same selected track and playback state | RAF resumes from its retained angle; if a pause arrived while hidden, the platter remains stopped |

PocketFloatingWindow moves the same WebView between the Activity and overlay. It does not construct a second Audio Director or issue `criPauseMusic` / `criStopMusic` commands during normal mode changes. The native CRI runtime belongs to MainActivity and is disposed only when the Activity is destroyed. This guarantee covers normal full/mini/bubble transitions, not Android process death or force-stop.

Disc rotation and stylus position are presentation only. The Director owns `needleDown` intent, CRI owns actual playback/fade/pause, and native CRI callbacks reconcile the visible status; the visual layer never sends playback commands.

## CRI Category / Cue Sheet status

The current branch uses criAtomExPlayer_SetFile with dedicated CRI players and CRI Tween. This is not yet Atom Craft Category/Cue authoring. There are no authored ACF/ACB/AWB banks in the source tree, so we must not call unconfigured Category names or claim official category routing is active.

The logical bus map is the migration contract. The next authoring stage is to create an Atom Craft project with MUSIC, AMBIENCE, MECHANICAL, UI, SFX, and VOICE categories; set Cue Limits, priorities, and REACT/ducking in authored data; build and package ACF/ACB/AWB; register the ACF and load the Cue Sheet; then change app requests from file paths to Cue names. If Category definitions change, rebuild both ACF and dependent ACB data.

## Japanese developer and audio-player findings

- Game Makers' Japanese report on Harvestella's SEAD workflow describes first/last-priority policies for repeated voices and category-based voice ducking. This supports explicit per-bus priorities and ducking, not one global stop queue.
- CRI's Japanese Category docs state that a Cue can belong to multiple categories, categories can control volume and cue limits, and player-assigned categories can coexist with Cue data unless category groups conflict (Atom library 2.20.31+).
- CRI's Atom Craft Japanese guide explains categories are game-wide rules, category metadata is stored in ACF, Cue membership is stored in ACB, and the paired outputs must be rebuilt together when categories change.
- The Japanese MPD package description is a useful media-player architecture analogue: playback service and user interface are separate; output routes, playlists, gapless playback, and crossfade are controlled independently. It is not a runtime to add to Pocket.

## Cross-checks from Japanese developer and music-player documentation

Unity's Japanese Audio Mixer documentation uses a persistent Master/group hierarchy, signal routing, snapshots, and ducking; this supports keeping routing and state transitions independent from the objects that trigger sound. Pocket mirrors that responsibility split through CRI player channels and the Audio Director, without embedding Unity or another mixer engine.

The Japanese moOde/MPD guide describes one playback daemon controlled by multiple clients, separate queue/playback/output configuration, and explicit renderer behavior. One useful caution is that some alternate renderers stop MPD playback rather than mix concurrently; Pocket's vinyl ambience therefore stays inside the same CRI runtime and is assigned its own CRI player channel.

References: [Unity Audio Mixer (Japanese)](https://docs.unity3d.com/ja/current/Manual/AudioMixer.html), [Unity Audio Mixer overview (Japanese)](https://docs.unity3d.com/ja/current/Manual/AudioMixerOverview.html), [moOde/MPD setup and playback architecture (Japanese)](https://www.openaudiolab.com/settingmoode/jp/).

## Verification invariants

- No parallel playback engine exists in the WebView or Java UI.
- All audible playback requests terminate in the same native CRI runtime.
- MUSIC and AMBIENCE use independent CRI player channels.
- BGM replacement touches MUSIC only.
- The selected BGM is requested only after the authenticated splash; the record-placement cue is requested only after native BGM readiness, and its completion wait is bounded.
- Ambience starts only after confirmed native BGM playback.
- Track replacement does not restart the ambience player.
- Stylus lift fades and pauses BGM plus ambience; no dedicated stylus-lift SFX is currently bundled.
- Normal full/mini/bubble mode changes never issue CRI pause or stop commands.
- Bubble mode suspends the hidden visual RAF only; return restores the turntable's retained angle and current needle state.
- Music, ambience, and effects have independent persisted gain controls.
- The visual layer cannot start, stop, or select audio.

## References

- [Harvestella sound priority and category ducking (Game Makers, Japanese)](https://gamemakers.jp/article/2024_04_22_66374/)
- [CRI ADX Category (Japanese)](https://game.criware.jp/manual/native/adx2/latest/criatom_feat_category.html)
- [CRI Atom Craft: Defining Categories (Japanese)](https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_category.html)
- [CRI Atom Craft: Cue priority and voice limits (Japanese)](https://game.criware.jp/manual/adx2_tool/latest/criatom_tools_atomcraft_cue_limit_and_priority.html)
- [MPD architecture overview (Debian Japanese)](https://packages.debian.org/ja/trixie/sound/mpd)
- [CRI streaming and D-BAS](https://game.criware.jp/manual/native/adx2_en/latest/criatom_feat_streaming.html)
