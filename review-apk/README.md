# Merzkava Pocket — Android Shell

Android shell implementation for the approved Pocket launch flow and homepage frame.

## Launch and access

- Cold start always opens the independent Login Gate.
- Player login accepts an exact character name from the currently pinned Merzkava Universe `players.md`. The native adapter resolves the active pinned SHA, verifies the registry, and stores the verified identity/profile reference locally for suggestions and later use. A local cache never bypasses the live registry check.
- Developer login uses the same PBKDF2-SHA-256 verifier contract as Merzkava APK (600,000 iterations). The password is not embedded or stored in plaintext. Optional Remember Me encrypts the credential pair with Android Keystore AES-GCM.
- The access routine displays one diagnostic line with three punctuation frames, randomized pauses, and a monotonic `15 → 32 → 51 → 70 → 88 → 93` path. It holds below 100% while the real operation is pending and completes only after successful verification.
- Successful login opens Floating Control. Pressing **Open game / continue playing** starts the local Pocket Transition routine, then the animated Splash hands off to Home.

## Floating Control

The Android adapter reads and requests real OS state in the documented order: overlay permission, notifications, background activity/battery exemption, then foreground-service status. The status comes from the service runtime, not from a simulated flag. Bubble and mini-window actions use the native Android service.

The screen retains the approved antique CRT header, Device Status panel, compact icon-only Initial Setup actions, and Quick Actions in this order: Open game / Continue, Start bubble mode, Open floating mini window, Stop service, Donate. The native bubble uses a matching CRT illustration.

Donate is a kindness panel only. It has a calm hospital-room scene, no payment flow, no pressure, and the approved Indonesian thank-you state.

## Home, Game interface and motion

The Home shell retains Dark and White themes, the double torn-paper four-destination dock, upper-right brush strokes, and the CRT television pull-cord. The pull-cord is drag-only: a tap does nothing; release inside the lower activation zone toggles the dock; recoil and drawer choreography run in parallel.

The **Game interface** now contains an Overview dashboard, Scene / Location Panel, Mode Hub with eight mode detail pages, Character progression archive, Inventory categories, Bestiary, Skillbook, Facilities catalogue, City layer, and World Atlas entry. Game stays inside the existing Home → Game → Daily Log-in → Settings navigation; the world map remains nested inside Game. The isometric preview is explicitly decorative until the actual scene renderer and scene records are connected.

The Game UI is a presentation layer, not a claim that simulation runtime is complete. Character values, Wallet balances, Inventory ownership, NPC presence, scene hotspots, routes, facilities, timers, combat, and activity outcomes are not yet connected to a local game database. Unconfigured or unavailable information is labelled rather than replaced with invented values. The existing Android WebView shell and PocketNative bridge continue to own the native access gate and Floating Control; this UI update does not pretend that a native gameplay database has already been implemented.

The intended game remains a **2D Isometric Location-Based Simulation**, not a free-roam RPG. Its scene interaction, location panel, travel between scenes (including walking and available mounts), time-based activities, world events, inventory, local persistence, and implementation sequence are defined in [Game Simulation Concept](../docs/game/GAMEPLAY_SIMULATION_CONCEPT.md).

All runtime formula and timer implementations are governed by the mandatory [Pocket Simulation Rules](../docs/game/POCKET_SIMULATION_RULES.md). This includes the ×48 accelerated simulation clock, Pocket-adapted Spirit Ring cooldown schedule, Arcanist/work timers, HP/Satiety/injury handling, economy ledger requirements, offline clock reconciliation, and online-only Daily Login. The mandatory rules document takes precedence over any conflicting shell note or prototype. The character progression, sequential Ring gates, Awakening process, Arcanist Focus/Grade certification, and mandatory HUD fields are specified in [Pocket Progression and HUD](../docs/game/POCKET_PROGRESSION_AND_HUD.md). The accessible activity modes and their shared-state rules are specified in [Pocket Gameplay Modes](../docs/game/POCKET_GAMEPLAY_MODES_AND_CATALOGS.md). Bestiary, skills/techniques, and Arcanistry content schemas are indexed in [Pocket Content Catalogues](../docs/game/catalogs/README.md).

Anime.js 4.x owns access pacing, the Pocket Transition, screen transitions, Splash, pull-cord and dock choreography, and the new Game panel entrance sequence. CSS owns the responsive Game surfaces, cards, scene-preview treatment, themes, and reduced-motion presentation. Augusto PXL remains a build-time visual-art authoring/export pipeline; it is not treated as an animation engine and no generated artwork is fabricated for this shell.

## Build

The GitHub Actions workflow builds a debug-signed installable APK and names it using:

`Merzkava-Pocket-v.0.01.004-xxxx.apk`

The debug signing key is generated by the Android build runner. Repository signing secrets are not read by this workflow. This is the Pocket shell build; game-world content, daily reward transactions and production game data integration remain separate workstreams.
