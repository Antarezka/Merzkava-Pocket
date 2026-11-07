# Pocket Pixel-Art Asset Rules

These rules are mandatory for the Merzkava Pocket game world.

## Visual target

Use the 2D pixel-art MMORPG language established by the user's references:
- Cổ Tiên Lộ / Cotienlo
- Elemental: 2D MMORPG by DAERI SOFT
- Hidden Dragon Wuxian RPG (retain the user's named reference; do not substitute a different game title)

The result should read as a cultivation MMORPG: identifiable individual characters, martial and spirit-themed clothing, class/role equipment, readable silhouettes, and a coherent tiled world.

## Mandatory asset pipeline

- Author character sprites, heads, garments, equipment, directional animations, map terrain, tiles, buildings, vegetation and world objects in PXL `.px.js` sources.
- Compile them through the pinned PXL build pipeline into transparent PNG sprites, PNG sprite sheets and the associated animation metadata/GIF previews.
- Use the resulting raster assets in the Pocket runtime. Keep nearest-neighbour rendering, pixel alignment and the authored frame dimensions.
- Characters must be individually authored/readable, with distinct faces or headwear, hair, clothing and gear. Do not fall back to one shared generic body with five recolor-only styles.

## SVG prohibition

**SVG must never be used for map or character artwork in Merzkava Pocket.**

This ban includes terrain tiles, map chunks, buildings, vegetation, rocks, world props, NPCs, the player, portraits, character previews, directional sprites and animation sheets. Do not reintroduce an SVG generator or SVG runtime loader for these asset classes.

SVG may only be considered for unrelated interface decoration where a raster/PXL game asset is not intended. This exception does not apply to any map or character visual.

## Runtime safeguards

- Do not add SVG map/character paths to Phaser preload or runtime rendering.
- Do not restore procedural vector character/map generators.
- Keep the PXL source and generated PNG outputs as the source of truth.
- Review character and map PNGs directly before considering a visual pass complete.
- This is a game asset workflow only; it does not authorize or trigger an Android/APK build.
