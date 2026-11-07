# Pocket Pixel-Art Asset Rules

These rules are mandatory for the Merzkava Pocket game.

## Visual target

Use the 2D pixel-art MMORPG language established by the user's references:
- Cổ Tiên Lộ / Cotienlo
- Elemental: 2D MMORPG by DAERI SOFT
- Hidden Dragon Wuxian RPG (retain the user's named reference; do not substitute another title)

The game should read as a cultivation MMORPG: individual characters, martial/spirit-themed outfits, role-specific equipment, readable silhouettes, and a coherent tiled world.

## Asset format boundary

**Menu/UI:** SVG is permitted for menu icons, menu illustrations, decorative UI and interface-only graphics. Keep existing menu SVG assets intact when editing the game world.

**Game artwork:** PXL is mandatory for all characters and all game-related/world assets. This includes the Player, NPCs, portraits/previews, equipment, animation frames, terrain, ground tiles, water, paths, buildings/facilities, vegetation, rocks, objects, effects and map scenes. Compile PXL `.px.js` sources into raster PNGs/sprite sheets (and related animation metadata/GIF review outputs). Do not use SVG as a substitute for any of these assets.

## Character art quality

- Each character must have an individually readable identity: face/head shape, hairstyle or headwear, garment construction, color palette, equipment and silhouette.
- Do not fall back to one shared generic body with only minor recoloring.
- Create directional sprites and animation frames in PXL; keep pixels aligned and use nearest-neighbour rendering.
- Review the generated PNG artwork directly before considering a visual pass complete.

## Engine and runtime

- The Pocket game engine remains **Phaser 4** (currently pinned to `phaser: 4.2.1`).
- The Phaser runtime must load PXL-generated PNGs for all game map and character artwork.
- Do not add SVG game-art paths to Phaser preload or world rendering.
- Do not restore the old SVG HD map/character generator.
- Keep PXL source and generated raster output as the source of truth.

This is a Pocket game asset/runtime change only. It does not authorize or trigger an Android APK build.
