# Pocket Audio Architecture

## Runtime ownership

Pocket has one playback engine: CRI ADX LE. Android and WebView are command/presentation layers only; they must not create a second audio engine through MediaPlayer, AudioTrack, HTMLAudioElement, or AudioContext.

- CRI engine (PocketCriAudioRuntime + JNI): owns playback players, decoding/streaming, looping, pause/stop, player gain, and CRI Tween fades.
- Audio Director (pocket-audio-director.js): owns intent and policy: selected BGM, when to start the ambience bed, how native status changes affect the deck, and which CRI channels receive effects.
- Visual presentation (audio-player.js + CSS): reads confirmed CRI status and animates platter, disc, stylus, and status light. It never decides playback state.

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

## Turntable state rules

1. The Director requests the selected BGM.
2. Only after CRI reports BGM as playing does the Director request vinyl crackle on its own channel.
3. Selecting a new record replaces MUSIC only. AMBIENCE is not stopped, restarted, or placed in a queue.
4. Pause/resume applies to BGM and ambience together. Stop fades and stops both.
5. Stylus and record placement use separate mechanical channels.
6. Disc rotation and stylus movement only reflect native CRI status.

## CRI Category / Cue Sheet status

The current branch uses criAtomExPlayer_SetFile with dedicated CRI players and CRI Tween. This is not yet Atom Craft Category/Cue authoring. There are no authored ACF/ACB/AWB banks in the source tree, so we must not call unconfigured Category names or claim official category routing is active.

The logical bus map is the migration contract. The next authoring stage is to create an Atom Craft project with MUSIC, AMBIENCE, MECHANICAL, UI, SFX, and VOICE categories; set Cue Limits, priorities, and REACT/ducking in authored data; build and package ACF/ACB/AWB; register the ACF and load the Cue Sheet; then change app requests from file paths to Cue names. If Category definitions change, rebuild both ACF and dependent ACB data.

## Japanese developer and audio-player findings

- Game Makers' Japanese report on Harvestella's SEAD workflow describes first/last-priority policies for repeated voices and category-based voice ducking. This supports explicit per-bus priorities and ducking, not one global stop queue.
- CRI's Japanese Category docs state that a Cue can belong to multiple categories, categories can control volume and cue limits, and player-assigned categories can coexist with Cue data unless category groups conflict (Atom library 2.20.31+).
- CRI's Atom Craft Japanese guide explains categories are game-wide rules, category metadata is stored in ACF, Cue membership is stored in ACB, and the paired outputs must be rebuilt together when categories change.
- The Japanese MPD package description is a useful media-player architecture analogue: playback service and user interface are separate; output routes, playlists, gapless playback, and crossfade are controlled independently. It is not a runtime to add to Pocket.

## Verification invariants

- No parallel playback engine exists in the WebView or Java UI.
- All audible playback requests terminate in the same native CRI runtime.
- MUSIC and AMBIENCE use independent CRI player channels.
- BGM replacement touches MUSIC only.
- Ambience starts only after confirmed native BGM playback.
- Music, ambience, and effects have independent persisted gain controls.
- The disc/stylus visual layer cannot start or stop audio.

## References

- [Harvestella sound priority and category ducking (Game Makers, Japanese)](https://gamemakers.jp/article/2024_04_22_66374/)
- [CRI ADX Category (Japanese)](https://game.criware.jp/manual/native/adx2/latest/criatom_feat_category.html)
- [CRI Atom Craft: Defining Categories (Japanese)](https://game.criware.jp/manual/adx2_tool/latest/craftv2_tips_program_decide_category.html)
- [CRI Atom Craft: Cue priority and voice limits (Japanese)](https://game.criware.jp/manual/adx2_tool/latest/criatom_tools_atomcraft_cue_limit_and_priority.html)
- [MPD architecture overview (Debian Japanese)](https://packages.debian.org/ja/trixie/sound/mpd)
- [CRI streaming and D-BAS](https://game.criware.jp/manual/native/adx2_en/latest/criatom_feat_streaming.html)
