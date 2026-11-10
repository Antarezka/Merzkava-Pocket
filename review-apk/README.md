# Merzkava Pocket — Android Shell

Android shell implementation for the approved Pocket launch flow and homepage frame.

## Launch and access

- Cold start always opens the independent Login Gate.
- Player login accepts an exact character name from the currently pinned Merzkava Universe `players.md`. The native adapter resolves the active pinned SHA, verifies the registry, and caches the registered **names only** on the device for suggestions. It does not download or import `players/<Name>.md`; local names are suggestions only and never bypass the live registry check. Player status, progression, Wallet and gameplay records belong to Pocket's own local save.
- Developer login uses the same PBKDF2-SHA-256 verifier contract as Merzkava APK (600,000 iterations). The password is not embedded or stored in plaintext. Optional Remember Me encrypts the credential pair with Android Keystore AES-GCM.
- The access routine cycles 20–50 role-specific technical fragments (Player network / Universe checks, local Developer credential verification, or local Pocket initialization). Each fragment is revealed word by word; selected delayed fragments repeat a leading `.`, `..`, `...` buffer sequence while the progress rail continues moving at variable speed. The rail stays below 100% while the real operation is pending and completes only after success.
- Successful login opens Floating Control. Pressing **Open game / continue playing** starts the local Pocket Transition routine, then the animated Splash hands off to Home.

## Floating Control

The Android adapter reads and requests real OS state in the documented order: overlay permission, notifications, background activity/battery exemption, then foreground-service status. The status comes from the service runtime, not from a simulated flag. Bubble and mini-window actions use the native Android service.

The screen retains the approved antique CRT header, Device Status panel, and compact icon-only Initial Setup actions. Its Quick Actions are limited to Open game / Continue, Open floating mini window, Stop service, and Donate. Floating Bubble is deliberately not a Floating Control action: its CRT toggle lives in the Home header. It starts the native foreground service only after overlay, notification, and battery readiness are confirmed; Pocket reports it active only after Android confirms the overlay view is attached. The draggable CRT bubble returns Pocket to the foreground when tapped, and the same Home-header toggle stops the service.

Donate is a kindness panel only. It has a calm hospital-room scene, no payment flow, no pressure, and the approved Indonesian thank-you state.

## Home and motion

The Home shell retains Dark and White themes, the double torn-paper four-destination dock, upper-right brush strokes, and the CRT television pull-cord. The Floating Bubble toggle sits in the Home header and remains separate from the dock. The pull-cord is drag-only: pull the TV down approximately 42 CSS pixels and release to toggle the dock; it no longer requires dragging to the bottom of the screen. The cord terminates behind the TV casing at its top-centre anchor, and the touch offset is preserved so the TV does not jump when a drag begins. Recoil and drawer choreography run in parallel.

Game navigation remains nested as Home Base → City → World Map. These are shell navigation destinations, not a definition of the gameplay model. The intended game is a **2D Isometric Location-Based Simulation**, not a free-roam RPG. Its scene interaction, location panel, travel between scenes (including walking and available mounts), time-based activities, world events, inventory, local persistence, and implementation sequence are defined in [Game Simulation Concept](../docs/game/GAMEPLAY_SIMULATION_CONCEPT.md).

All runtime formula and timer implementations are governed by the mandatory [Pocket Simulation Rules](../docs/game/POCKET_SIMULATION_RULES.md). This includes the ×48 accelerated simulation clock, Pocket-adapted Spirit Ring cooldown schedule, Arcanist/work timers, HP/Satiety/injury handling, economy ledger requirements, offline clock reconciliation, and online-only Daily Login. The mandatory rules document takes precedence over any conflicting shell note or prototype. The character progression, sequential Ring gates, Awakening process, Arcanist Focus/Grade certification, and mandatory HUD fields are specified in [Pocket Progression and HUD](../docs/game/POCKET_PROGRESSION_AND_HUD.md). The accessible activity modes and shared-state rules are specified in [Pocket Gameplay Modes](../docs/game/POCKET_GAMEPLAY_MODES_AND_CATALOGS.md). Bestiary, skills/techniques, and Arcanistry content schemas are indexed in [Pocket Content Catalogues](../docs/game/catalogs/README.md).

## Economy runtime now included in the APK build

- The Game page opens **Living Economy**. Every APK build copies the four structured economy JSON catalogues from `docs/game/catalogs` into bundled Android assets. The build also generates a catalogue manifest with the catalogue version, source commit, record counts and SHA-256 hashes.
- Before packaging, the build validates 1,000 unique item IDs, 200 unique facility IDs, 20 unique recipe IDs and every recipe's facility/item references. The runtime checks the bundled manifest and record counts before opening the economy. Items and facilities are searchable; records show their Requirements, tools, rates, prices, uses, materials and Pocket-clock duration.
- A local Pocket-character-scoped economy state stores Wallet, inventory, owned facilities, running/completed processes, access records, builder assignments and transaction ledger in WebView local storage. Pocket state is independent of Universe character snapshots: Universe supplies the registered character name for identity matching only; it does not supply Wallet, progression, inventory or gameplay status. Save schema v3 backs up older saves before migration, preserves Pocket inventory/facilities/processes/access/builder/ledger data, and removes the old automatic Universe-profile Wallet credit from legacy saves. A save from a newer schema is blocked rather than overwritten. Each character has a separate Pocket save key. Purchases, sales, supported gathering, construction, listed upgrades and the 20 explicit recipes use the same item IDs and currency values as the Pocket catalogue.
- Process completion is reconciled from a persisted finish timestamp. Pocket simulation minutes are converted to real time by dividing by 48 exactly once. A Developer-only, one-time **700 xs QA sample pack** is available for build testing; Player profiles do not receive it.

**Current implementation boundary:** this is a first local economy runtime, not a completed world simulation. Market buttons use catalogue baseline prices and do not yet verify an actual vendor, regional stock or the character's live map location. Site access is explicitly player-recorded until the isometric world-location system is connected. Facility outputs are displayed, but only the 20 listed recipes and eligible gathering actions currently create process outputs; other production records remain locked rather than guessed. Timers currently reconcile against the device wall clock and are not yet protected by an authoritative server clock.

Home/Game navigation now exposes the economy. The isometric world, travel simulation, live location/area discovery, general job wages, Daily Login transactions, global inventory sharing with all other modes, Hunt, Socialize, Sparring, War Zone, Skillbook, Bestiary and Arcanistry gameplay runtime remain separate implementation work. Mandatory design documents are not evidence that those other features are playable.

Anime.js 4.x owns access pacing, the Pocket Transition, screen transitions, Splash, pull-cord and dock choreography. CSS owns surfaces and static/reduced-motion presentation. Augusto PXL remains a build-time visual-art authoring/export pipeline; it is not treated as an animation engine and no generated artwork is fabricated for this shell.

## Build

The GitHub Actions workflow builds an installable APK using one persistent signing certificate and a monotonically increasing Android `versionCode`. Updates to `review-apk/**` or `docs/game/**` trigger a new APK, so economy catalogue/specification edits are included in the next package. Android installs the downloaded APK over the existing app when the package ID and signing certificate match; app-private data (including WebView local storage, economy saves, player data and preferences) is retained during a normal package update. The in-app updater is available at the bottom of Settings under Pocket Update. Its compact disclosure shows the installed and latest build, release notes, APK size, and remaining internal storage; Pocket can download the release, verify its SHA-256 digest, and open Android's package installer. A small in-app notice appears once for each newly detected build. Normal signed updates preserve app-private data.

### One-time signing setup (required)

Create one Android upload keystore and keep it permanently. Add these four GitHub repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `POCKET_KEYSTORE_BASE64` — the keystore file encoded as Base64
- `POCKET_STORE_PASSWORD` — keystore password
- `POCKET_KEY_ALIAS` — key alias
- `POCKET_KEY_PASSWORD` — key password

The workflow stops if these secrets are missing; it must never silently generate a different key for a later build. Keep a secure offline backup of the keystore and passwords. If the signing key is lost, Android will reject in-place updates signed with a replacement key.

**Important migration note:** earlier review builds were signed with GitHub runner-generated debug keys. Those keys were not persisted by the old workflow, so an already-installed APK from that old pipeline may not accept the first persistent-key build as an in-place update. That first transition may require one uninstall/reinstall. After the persistent key is configured and its first APK is installed, subsequent builds can be installed over it without uninstalling and without clearing app data.

The APK filename remains:

`Merzkava-Pocket-v.0.01.007-xxxx.apk`

CI no longer relies on a runner-generated debug key. It requires the persistent signing secrets listed above and fails before packaging if they are absent. The APK currently bundles the economy JSON catalogue data; the other catalogue and progression documents remain design/source material until their respective gameplay runtimes are implemented.
