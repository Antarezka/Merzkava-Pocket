# Player List, Session Save Codes and Master Reset

## One toolbar destination

Pocket has one Player List toolbar destination. The page reads the authenticated native role:

- **Player:** shows only that Player's own profile, current session save code and their own Master Reset input.
- **Developer:** shows the local Player directory. Each Player is a collapsible row containing a save-code input, a per-row SAVE action and a Developer-only Master Reset grant issuer. The header action copies the complete validated save directory and reset-grant manifest.

No second toolbar destination is created for these functions.

## Player login and local registration

Player login does not ask for a Player password.

At gate startup, Pocket reads the names stored in this installation. The name field does not present an autocomplete/datalist popover; the helper text simply reports whether the exact typed name exists locally.

Every Player login and every new local Player registration still requires internet access. Pocket fetches the pinned Universe README, resolves the current source commit, and verifies the current `players.md` registry. A local Pocket name is an additional accepted source, not an offline-login bypass.

A name found locally or in the pinned Universe list can use Player Login. A new name can use the separate New Player Account panel. Registration uses the same online pin check, then saves the new name in Pocket's local player-name registry and creates its profile. A locally registered name can subsequently log in from that installation, but it still requires the online pin check each time.

Developer login remains local/offline.

## Full Player session save code

The Player's current save code is a complete compressed snapshot, not a short lookup token.

Format:

`MZKSV1.<Base64URL-deflate-payload>.<SHA-256>`

The decoded envelope contains:
- Player display name and the hidden Pocket profile key used to match the correct save owner
- session generation, issue timestamp, nonce and save-reset epoch
- character profile and stats
- Pocket economy save: wallet, inventory, facilities/buildings, processes, home-rest state, needs, appearance slots, builder records and ledger
- relationships, achievements and Daily Login tracking when those records exist

The code is created from the Player's current local Pocket save when the Player List page packages their latest state. It is regenerated after every successful Player login and whenever the Player explicitly refreshes the save snapshot for handoff. The previous session code is replaced.

The save code is compressed and protected by a SHA-256 integrity checksum. **It is not encrypted.** The correct description is decoding/parsing and restoring the structured save format, not decrypting ciphertext. Do not treat the checksum as confidentiality or as account authentication.

## Developer SAVE workflow

Inside the single Player List page, each Player name opens its own dropdown. The Developer pastes that Player's full `MZKSV1` code into that row and presses **SAVE PLAYER DATA**.

Pocket validates the envelope format, checksum, Player name, hidden profile key, session generation and Master Reset epoch before changing the local Developer-side profile. Invalid or mismatched codes do not replace existing data. An accepted snapshot is stored under that Player's profile.

The header **COPY ALL SAVED PLAYER DATA** action exports the validated saved snapshots and the outstanding Master Reset grants together. Only validated snapshots are included. Old saves from before a pending Master Reset epoch are excluded.

## Developer Master Reset and Player reset input

The Developer issues a per-Player code from that Player's dropdown using **GENERATE MASTER RESET CODE**. The returned raw code is intentionally visible and copyable so the Developer can send it privately to the correct Player.

Code format:

`MZK-R-<48 uppercase hexadecimal characters>`

The raw reset code is never stored in the Player profile or placed in the update bundle. Pocket stores its SHA-256 hash, bound to the Player's hidden profile key, the name, and the expected next save-reset epoch.

The header update export includes a `masterResetGrants` array. For the next APK build, copy that array into:

`review-apk/app/src/main/assets/player-master-reset-grants.json`

The asset has format `MERZKAVA_POCKET_MASTER_RESET_GRANTS_V1`. A default empty template is committed. Only the matching Player's installed build can validate that Player's grant. The raw code should be delivered privately (for example, via the Player's agreed Discord or email channel); do not put it in a public repository or the build asset.

After installing the build that contains the grant, the Player opens their own Player List dropdown, enters the unmasked reset code and presses **RESET MY GAME**. Pocket checks the grant against the build asset, checks that it belongs to the active Player, and consumes it once. It clears that Player's local Pocket economy save and backup versions plus their Pocket game snapshot, inventory, facilities, relationships, wallet, achievements and gameplay progress. It preserves the Player name, local registration, account profile identity, device binding and active session. A fresh full save code is issued for the new game.

Used grants are recorded locally and cannot be redeemed again. Issuing a newer grant replaces the outstanding hash in the next update manifest.

## Data handling

- Passwordless Player access is intentional in this Pocket gate. It is based on exact name recognition in Pocket-local or current Universe records plus online pin verification.
- Android Keystore device binding remains an additional local device check.
- Developer lists never receive a Player's raw current session save code or raw Master Reset code.
- Master Reset manifests contain hashes, not raw codes.
- Save codes are portable structured snapshots with checksum, not encrypted secrets.
