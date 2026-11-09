# Merzkava Pocket — Access and Transition Routine

**Status:** Implementation handoff  
**Visual reference:** Merzkava APK `docs/ACCESS_LOADING_ROUTINE.md`  
**Runtime:** `review-apk/web/src/main.js` and `review-apk/web/src/styles.css`

## Flow

The app opens in this order:

0. First-launch bird mark — a high-resolution transparent Shimaenaga vector fades in and out over a black field.
1. Login Gate — Player or Developer.
2. Floating Control — identity is verified; Android permissions remain a separate check.
3. Pocket Transition — appears only when the player presses **Open game / continue playing**.
4. Splash scene — animated handoff into the application.
5. Home menu — Home, Game, Daily Log-in, Settings; Game retains its nested Home Base → City → World Map route.

The Pocket Transition must not skip Floating Control or silently jump from Login Gate to Home.

## Clockwork access scene

Use the same cinematic Victorian horological instrument in both themes, with theme-specific materials:
- Dark: blackened steel recesses and dark enamel, driven by a breathing ivory-white glow. Orange is not used as the loading instrument's active energy color.
- White: warm porcelain / vellum plate, charcoal-black gears and engravings, with soft black vapor or condensation rising around the mechanism. This is not a brightened copy of the Dark scene.

Both variants retain a mechanically coupled gear pair with a matched counter-rotation ratio, a rocking escapement, a pendulum, the Merzkava medallion, a scanning reflection and six mechanical progress stations. Keep the mechanism legible on narrow Android screens.

The scene contains one active diagnostic message slot. It replaces the previous message rather than stacking a history. Each stage displays the same message in three successive frames:

- `Message.`
- `Message..`
- `Message...`

The line changes in place with a short Anime.js arrival. Its `.`, `..`, and `...` frames are the buffer indicator: the progress rail continues smoothly while the dots advance, then takes brief, deliberate holds. Never make the rail jump from checkpoint to checkpoint. The progress path remains single-pass and strictly increasing through `15 → 32 → 51 → 70 → 88 → 93`. Do not label checkpoints as a measured network percentage.

## Operation contract

- Login routine starts only after the Player or Developer form is submitted.
- Pocket Transition starts only after **Open game / continue playing** is pressed.
- Player input has no autocomplete or suggestions. Identity lookup checks both Pocket's previously registered local player names and the current Universe `players.md` registry. A live internet connection and a verified current pin are still required for every Player sign-in; the local source is not an offline login bypass.
- Developer Settings contain a collapsed, scrollable account-recovery section. A normal password change remains Player-initiated and validates the current password first. The Developer-only Master Reset tool scans Pocket-local and Universe player records, requires an ownership confirmation, and creates an account-bound AI handoff request; it does not reset a password or generate the player's final confirmation code.
- Developer PBKDF2 verification is local and works fully offline; the same six-stage fake loading scene still runs. Remembered credentials are protected by Android Keystore.
- Pocket transition wording describes actual local session, theme, and Android status reads. It does not claim a cloud sync.
- Progress stays below full completion while the real operation is pending.
- Hold near the last checkpoint while the actual operation remains unresolved.
- Reach 100% only after success. On error or cancellation, close the routine and show the real error on the owning screen.
- Respect reduced motion and cancel active Anime.js animations when the routine ends.

## Floating Control

Preserve the approved structure in `FLOATING_CONTROL.md`. Device Status remains separate from account identity. Initial Setup uses compact icon-only actions in the approved order. Quick Actions remain:

1. Open game / Continue
2. Start bubble mode
3. Open floating mini window
4. Stop service
5. Donate

Donate is a kindness panel only: no payment flow, no pressure, and no donation checkout. The thank-you state displays the approved Indonesian message.
