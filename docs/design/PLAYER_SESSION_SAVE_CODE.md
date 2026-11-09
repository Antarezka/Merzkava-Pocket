# Player List and MZKSV1 Portable Save Code

## Player access

Player Login asks only for the exact registered character name. Every Player login and registration must verify the current README-pinned Merzkava Universe source and its `players.md` registry online. Pocket does not ask a Player for a password. Developer login remains local/offline.

On the first successful Player login on a device, Pocket creates a non-exportable signing key in Android Keystore and binds its public-key fingerprint to the local profile. Later sessions on that installation must prove possession of the same key. Developer can reset the device binding when a Player needs to enroll a replacement device.

This is a local/device safeguard, not a global account-ownership service. Without a server or a password/one-time invitation, a name-only first login cannot prove the human owner of a public Universe character name, and Keystore binding does not synchronize across different phones. The app must not describe it as cross-device identity proof.

## Rotating save code

The visible code is a portable complete save snapshot. It is generated from 128 bits of cryptographically secure randomness in the session nonce and is refreshed on every successful Player login. It is also refreshed when the Player opens Player List after the current Pocket Economy state has been synchronized into the encrypted profile store.

Format:

`MZKSV1.<Base64URL(zlib(JSON))>.<SHA-256(compressed-bytes)>`

The decoded JSON envelope has this structure:

- `format`: `MERZKAVA_POCKET_SAVE_V1`
- `version`: save schema version
- `player`: exact Player name and a hidden deterministic profile key
- `session`: increasing session generation, issue timestamp and random nonce
- `data`: Player profile, imported character data, achievements when recorded, and the full Pocket Economy snapshot

The Pocket Economy snapshot is exported from the same local state used by Pocket Economy and Home Base. It carries wallet, inventory, facilities/buildings, production processes, transaction ledger, home-rest state, needs, appearance slots, save metadata and catalogue schema version.

The session code is stored in Pocket's Android Keystore-encrypted local profile store. Player sees it as a password-style masked field by default, with Show/Hide and Copy actions. It is not shown in Developer's Player directory.

## Encoding, checksum and encryption

MZKSV1 is compressed and encoded, not encrypted. Base64URL is an encoding, zlib is compression, and SHA-256 is an integrity checksum. The checksum catches accidental truncation or modification, and strict schema validation rejects malformed or unsupported payloads. It is not a digital signature and does not prove that a snapshot was created by an official Pocket build. Anyone who knows the format can construct a new payload and recompute an ordinary checksum.

Do not call MZKSV1 encrypted. It is intentionally decodable by a future Pocket build or an authorized migration tool so the save can be restored during app updates.

## Developer Player List workflow

Every Player name appears in a collapsible profile row. Inside each row Developer can paste that Player's current MZKSV1 code and press **SAVE PLAYER DATA**. Pocket validates:
- exact Player name selected in the dropdown;
- the deterministic hidden profile key;
- MZKSV1 envelope and version;
- Base64URL/zlib payload and SHA-256 checksum;
- required Player, session and data sections;
- a session generation higher than the last generation already saved for that Player.

A rejected code does not replace the previous saved profile. A successful save stores the incoming code, full snapshot and session metadata under the same hidden profile key.

The header action **COPY ALL SAVED PLAYER DATA** exports only Player records with a successfully validated saved code. The output format is `MERZKAVA_POCKET_SAVE_DIRECTORY_V1` and contains each Player name, complete code, session generation, saved timestamp and decoded snapshot data. It is intended for a private Developer-to-AI/update handoff. Keep it private because it contains the Players' complete save data.

## Session expiry limitation

The Player device rotates its displayed code on each login. Developer rejects duplicate or older generations that have already been saved. However, without a shared online revocation service, a separate Developer device cannot know that a Player has logged in again until the new code is submitted. Therefore an old, never-before-saved code may still pass the monotonic-generation check. Instant cross-device revocation requires a shared online registry/backend; it cannot be guaranteed by two offline local stores alone.

## Daily Login and achievements

The current Daily Login scene is a shop/interior experience and does not yet persist claim events or consecutive streaks. The save schema carries the daily-login achievement fields, but they remain `null` / `not-recorded` until a real claim/streak system writes them. Do not infer or fabricate a longest streak from app logins.
