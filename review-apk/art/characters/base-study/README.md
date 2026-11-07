# Merzkava Pocket — Character Base Study

This folder is an isolated PXL study. It is **not** the production character source and must not replace or edit `../isometric-cultivator.px.js` until the base and the wardrobe are approved.

## Purpose

Find one reusable human base with a slightly enlarged head, a short neck and ordinary body proportions. Then dress that same base with five distinct, removable wardrobe sets. The character should read as a person wearing clothing, not as a body painted with tight color patches.

The visual direction combines the references already named by the project owner:

- **Cotienlo** — retain the user's supplied reference as a visual target; do not silently substitute another game or style.
- **Hidden Dragon Wuxian RPG** — use the wuxia direction for layered garments, practical martial silhouettes, hair, carried weapons and back equipment. Keep the supplied title as named; do not conflate it with a similarly named game.
- **Elemental: 2D MMORPG (DAERI SOFT)** — use its small readable pixel-character scale, clear class silhouettes and recognizable equipment changes as a readability reference. [Official Google Play listing](https://play.google.com/store/apps/details?id=com.ykh.elemental).

These are direction references only. Do not copy their characters, sprites, logos, proprietary designs or game assets.

## Folder map

```text
base-study/
├── README.md
├── BASE_SPEC.md
├── WARDROBE_SPEC.md
├── preview.px.js             # PXL entry point; renders the base + five outfits
├── base.px.js                # one anatomy, face guide, dimensions and pivot
└── wardrobe/
    ├── shared.px.js          # detachable slot logic, cloth behavior and shared renderer
    ├── hanfu.px.js
    ├── cultivator.px.js
    ├── long-robe.px.js
    ├── assassin.px.js
    └── sect-guard.px.js
```

The PXL clothing helper is staged by the preview workflow at `review-apk/art/characters/_pxl-dress.px.js`. It is deliberately not vendored into this folder.

## Required work order

1. **Approve the base first.** Render `base_idle_*` and `base_walk_*` in all eight directions. Check head size, neck, shoulders, torso, hips, legs, hands, foot placement and the ground line. Do not refine costume details to hide a bad base.
2. **Lock the base anatomy.** Once accepted, treat `base.px.js` as the shared source of truth. An outfit may add cloth volume outside the skeleton, but must not silently change the body, head, neck, limb lengths, pivot or gait.
3. **Build the five wardrobes independently.** Each wardrobe file owns its hair choice, head accessory, top, bottom and back equipment. Do not merge the five designs into one recolored robe.
4. **Prove the cloth moves.** Review every outfit in idle and walking. Sleeves, hems, coat panels, ribbons and loose hair should lag, trail or sway in a restrained way. Cloth must have visible clearance from the body and must not cut through legs or arms.
5. **Review the eight-way turn.** Check front, diagonals, profile and back. A sword, hair ornament, hood, sleeve or back item must stay attached to the correct side and must not jump, disappear or cross through the face.
6. **Only then compare styles.** The five outfits must remain recognizable at the actual small in-game scale, not only when enlarged.

## PXL preview

The dedicated GitHub Actions workflow checks and builds this entry separately from the world archive. The resulting artifact contains both the existing world review and this study's PXL exports. Expected study outputs include:

- `anims/base_idle_s.png` and `anims/base_walk_s.png`
- `anims/hanfu_idle_s.png` and `anims/hanfu_walk_s.png`
- the equivalent idle/walk exports for `cultivator`, `long_robe`, `assassin` and `sect_guard`
- the `merzkava_character_base_study` comparison sheet

Local commands, from the repository root, after PXL and its clothing helper are available:

```sh
node "$PXL" check review-apk/art/characters/base-study/preview.px.js
node "$PXL" build review-apk/art/characters/base-study/preview.px.js --out ./out/character-base-study --share 4
```

## Approval rule

This is a **study branch only**. No game runtime, NPC roster, existing art, isometric map, UI, SVG or production character is changed by this folder. Do not discard the older attempts until the owner explicitly selects an approved base and wardrobe direction.
