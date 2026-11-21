# Claude Handoff — Replace the Legacy Game Inside Merzkava Pocket

**Priority: mandatory before integrating the new game being built in Claude.**  
**Target branch: `claude-today2`**  
**Scope: the Game screen and its legacy gameplay implementation only.**

## Exact Pocket baseline — verified latest published APK

Use the latest published Pocket release as the app-shell baseline unless a newer approved release is published before integration:

- Release: **Merzkava Pocket Build #429**
- Version: **v.0.01.007-4aa649d**
- Release tag: `pocket-build-429`
- Release/source commit: `4aa649d`
- APK: [Merzkava-Pocket-Build-429-4aa649d.apk](https://github.com/Antarezka/Merzkava-Pocket/releases/download/pocket-build-429/Merzkava-Pocket-Build-429-4aa649d.apk)
- Published: **2026-11-12 09:41:46 UTC**

This is the latest published release verified when this handoff was updated. Start by checking out the release source commit/tag (or the corresponding current `main` history) and inspect its actual tree before editing. The `claude-today2` branch contains this handoff/documentation; do **not** assume it is itself the Build #429 app source baseline. If a newer release exists by the time work begins, verify it on GitHub and update this baseline before proceeding. Do not build or publish an APK without the user's explicit approval.

## Required outcome

The current Pocket app must not ship the old game as a placeholder or alongside the replacement. Before the new Claude-built game is integrated into the **Game** screen, remove the legacy Game implementation from the app runtime.

Treat the old **map/world scene, character/player implementation, character selection/customization, wardrobe/outfit/shop UI, and their old gameplay flows** as legacy content to be removed from the active Game experience. Remove their obsolete runtime wiring, routes, menu entries, scene registrations, and game-only assets/code when they are no longer referenced. Do not merely hide the old screens behind disabled buttons.

## Replacement integration gate

1. Do not embed or expose the new game until its files, entry point, assets, dependencies, and launch/return flow have been reviewed.
2. Once the new game is ready, integrate it as the sole gameplay experience opened by the **Game** menu.
3. Verify that no old map, old character screen, or old wardrobe screen can still be reached through navigation, deep links, fallback routes, or stale cached assets.
4. Test a clean install and an update install. Confirm that saved app settings and unrelated user data are not accidentally erased.

## Preserve these independent Pocket app features

Do **not** remove or merge these while cleaning up the legacy Game:

- Home menu entries: **Game**, **Daily Login**, and **Settings**. Daily Login remains a separate top-level destination, never a subsection of Game.
- Floating Control and its approved interaction/visual behavior.
- Audio system, CRI/ADX playback, vinyl player, notification controls, and user audio files.
- APK updater, download/recovery behavior, and old-build cleanup.
- Access/login flow, loading transition, app shell, theme/settings, and other non-game infrastructure.

## Reference material versus active implementation

Existing map, character, sprite, wardrobe, and gameplay documents/assets may be retained in Git history or clearly marked as **legacy/archive reference** if they are useful for historical context. They must not be treated as instructions to restore the old game or as dependencies of the replacement. Do not delete shared app assets or unrelated resources without checking references first.

## Completion report required

Before declaring the replacement integrated, report:
- Which legacy Game files, routes, scenes, and assets were removed or archived.
- Which app-shell and independent features were preserved.
- The new game's entry point and integration boundary.
- Clean-install and update-install test results, including anything not tested.

**Do not build or publish an APK as part of this handoff note.**

## Current cleanup checkpoint — completed on `claude-today2`

The Game destination has been reduced to a deliberate integration placeholder:

- **Put Entire RPG Game Here**
- **Start from Main Menu.**

The old Home Base, Economy, City, and World Map routes are no longer accepted by Pocket navigation. The Game screen no longer links to any legacy gameplay destination.

The following legacy Game runtime files were deleted from the active branch:
- `review-apk/web/src/economy.js` and `economy.css`
- `review-apk/web/src/home-base.js` and `home-base.css`
- `review-apk/web/src/wardrobe-shop.js`
- `review-apk/test/wardrobe-shop.test.js`
- `review-apk/art/world-archive.px.js`
- `review-apk/art/human-character-base.px.js`
- `review-apk/art/human-appearance-layers.px.js`
- `review-apk/scripts/build-world-assets.mjs`

The app entry file no longer imports or mounts the deleted gameplay modules. **Daily Login remains separate and intact.** Home, Settings, Floating Control, audio infrastructure, access flow, and the Pocket shell are outside this cleanup and must remain intact.

The files under `docs/game/` are retained as documentation/reference only; they are not active Game runtime or assets. Do not restore the removed implementation from Git history. Claude should build the new RPG independently and integrate it into the Game destination, beginning at the new game's own main menu.

No APK was built or published as part of this cleanup.
