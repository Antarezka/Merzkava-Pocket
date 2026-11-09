# Player Session Save Code

## Purpose

The Player session save code is a rotating handoff credential. It is not a permanent Player ID and it is not the database key for the player's profile.

Format:

`MZK-S-<32 uppercase hexadecimal characters>`

The code is generated from 128 bits of cryptographically secure randomness and stored in the encrypted Pocket player-profile store. A new code is issued after every successful Player login, including first account registration. The previous code is replaced and becomes invalid as soon as the new login succeeds.

## Profile and save ownership

The underlying Pocket profile record has a separate internal storage key. That internal key stays stable so existing save data remains attached to the same account while the visible handoff code rotates. It is not displayed to the Player and is not treated as an account credential.

The current session save code is displayed only in the Player's own Player List page. It is masked by default, with explicit Show/Hide and Copy controls. The Developer directory never receives the raw code; it receives only a boolean indicating whether a code has been issued and the session generation number.

A Developer can paste a code received from a Player into the Player List's incoming-save-code checker. The native bridge compares it against the current encrypted profile records and returns the matching Player name and session generation without returning the code. An old code no longer matches after a successful next login.

The bridge also exposes:
- `getCurrentPlayerSessionSaveCode()`: returns the code only for the currently authorized Player session.
- `getCurrentPlayerSessionSaveCodeIssuedAt()`: returns the issue timestamp for that Player session.
- `isCurrentPlayerSaveCode(name, code)`: verifies the currently stored code for a named profile.
- `lookupPocketPlayerBySessionSaveCode(code)`: Developer-only lookup for a code submitted by a Player.

## Login rules

Every Player login and account registration still requires an active internet connection to verify the current pinned Merzkava Universe player registry. A local Pocket player-name entry does not permit offline Player login. Developer login remains available offline.

Player authentication requires the saved account password and the device key bound to that profile. The session save code is a save-handoff reference, not a replacement for the account password or device proof.

## Privacy and update handoff

The raw session save code is never shown in Developer records or included in the Developer update-export bundle. The player profile and its save data remain associated with the internal profile key across updates; the next successful Player login issues a fresh session code.

Password data remains a salted PBKDF2-HMAC-SHA256 verifier in the Android Keystore-encrypted profile store. Plain-text passwords are not stored or exported.
