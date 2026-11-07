# Merzkava Pocket — Access and Transition Routine

**Status:** Implementation handoff  
**Visual reference:** Merzkava APK `docs/ACCESS_LOADING_ROUTINE.md`  
**Runtime:** `review-apk/web/src/main.js` and `review-apk/web/src/styles.css`

## Flow

The app opens in this order:

1. Login Gate — Player or Developer.
2. Floating Control — identity is verified; Android permissions remain a separate check.
3. Pocket Transition — appears only when the player presses **Open game / continue playing**.
4. Splash scene — animated handoff into the application.
5. Home menu — Home, Game, Daily Log-in, Settings; Game retains its nested Home Base → City → World Map route.

The Pocket Transition must not skip Floating Control or silently jump from Login Gate to Home.

## Clockwork access scene

Use a compact Victorian clockwork instrument: dark verdigris enamel, forest-green lacquer, engraved concentric dial marks, aged-brass rails, warm champagne illumination, a central Merzkava medallion, a scanning reflection, and a segmented progress rail. Keep it small and legible on narrow Android screens.

The scene contains one active diagnostic message slot. It replaces the previous message rather than stacking a history. Each stage displays the same message in three successive frames:

- `Message.`
- `Message..`
- `Message...`

The line changes in place with a short Anime.js arrival. The progress path is single-pass and strictly increasing through `15 → 32 → 51 → 70 → 88 → 93`. Advance and pause timing is deliberately uneven. Do not label checkpoints as a measured network percentage.

## Operation contract

- Login routine starts only after the Player or Developer form is submitted.
- Pocket Transition starts only after **Open game / continue playing** is pressed.
- Player diagnostics describe the pinned Universe registry and the local verified-player cache.
- Developer PBKDF2 wording is reserved for the real local credential verifier; remembered credentials are protected by Android Keystore.
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
