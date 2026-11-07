# Merzkava Pocket — 2.5D HD Isometric Art Direction

**Decision date:** 2026-11-07  
**Status:** Approved visual direction · implementation in progress  
**Scope:** Pocket app shell, Home Base, character presentation, map scenes, facilities, objects, items, HUD and supporting illustrations.

## 1. Visual identity

Merzkava Pocket adopts one coherent **2.5D HD isometric** visual system. The world should feel like a small, fully inhabited three-dimensional cultivation setting viewed through a stable isometric camera, while remaining lightweight and readable on a phone.

This is not a flat pixel-map refresh and not a switch to unrestricted 3D free-roam. Use high-detail 2D artwork and layered isometric assets with convincing volume, lighting, material response, elevation and depth. The simulation remains location-based: players tap places, characters, facilities and resources to perform contextual actions.

All shipped artwork must be original Merzkava material or assets with a documented license. Build the visual language from the requirements below; do not reproduce third-party characters, maps, logos, sprites, UI assets or proprietary layouts.

## 2. World and isometric scene

- Use a stable orthographic/isometric camera and one calibrated diamond-grid projection per map family.
- Give terrain, paths, water, cliffs, stairs, bridges, platforms and buildings visible height and edge thickness. Surfaces need readable top planes and shaded vertical faces rather than flat colored diamonds.
- Construct the world from separable layers: ground, paths/water, elevation, buildings/facilities, vegetation, small props, actors, effects and foreground occluders. Distant scenery may be composited where it does not need interaction or independent depth.
- Buildings must read as complete structures with roofs, walls, doors, windows, foundations, cast shadows and believable footprints. Do not present every facility as a flat icon placed on a tile.
- Trees, rocks, plants, lanterns, wells, fences, furniture and resource nodes need their own ground pivots and depth values.
- Preserve a clear distinction between visual geometry and authoritative gameplay data. Collision, occupancy, placement rules, walkable areas, hotspots and Requirements remain data-driven and must never be inferred from artwork.
- Sort actors and objects by their ground-contact position. Foreground walls, roof edges and foliage may occlude an actor only where the map explicitly defines that layer.
- Keep the world visually rich but uncluttered. A mobile player must be able to distinguish a path, open tile, building entrance, NPC and resource node at normal phone scale.

## 3. Character direction

Characters receive a **complete visual rework**. Replace the current tiny flat head/body tokens and 32×42 pixel sprites with full-body, high-detail, stylized martial-fantasy figures that feel native to the 2.5D world.

Every Player and NPC should have:
- A distinct full-body silhouette, readable face and hair shape, layered clothing, sleeves, hems, footwear and clear costume materials.
- Individual details such as hair ornaments, belts, embroidery, armor pieces, weapons, tools, bags and profession-specific equipment where appropriate.
- Stable proportions and a believable scale beside doors, stairs, houses, trees and other people. Avoid both miniature unreadable figures and oversized characters that dominate buildings.
- A consistent Merzkava rendering treatment across the entire cast. Differences between characters come from their design, costume, palette, body shape and equipment—not from mixing unrelated pixel, flat-vector and painted renderers in one scene.
- Distinct silhouettes and palettes for Player, residents, workers, teachers, guards, merchants, visitors and creatures. Do not rely on a tint overlay as the primary way to make NPCs look different.

### Sprite and animation contract

- Characters are authored as high-resolution transparent 2D renderings of a consistent 2.5D design. They may use 3D-rendered source poses, but the shipped runtime remains a lightweight sprite/atlas presentation unless a separately measured engine change is approved.
- Target frame canvas: **128×160 source pixels**, with **96×128 as the minimum** only when the final device-scale test proves face, clothing and equipment remain readable. Supply higher-density exports where they improve close-up or profile views.
- Every active field character must provide eight headings: N, NE, E, SE, S, SW, W and NW.
- Idle and walk are mandatory for all eight headings. Each loop must have enough frames for clear motion (at least four for the initial pack); interaction, talk, gather, work, spar/attack, hurt and other actions are added when the character's gameplay needs them.
- Use a fixed frame canvas, transparent background and stable bottom-centre foot-contact pivot across every direction and animation. Hair, robes, weapons and accessories may extend beyond the body silhouette but must not move the ground pivot.
- Keep the ground shadow separate from the character body so it can be scaled and composited with the map.
- Artwork never intercepts gameplay input. Existing scene hit areas and interaction handlers remain separate from transparent sprite pixels.

## 4. Character appearance and save compatibility

The old appearance values are legacy save data, not permission to keep the old pixel renderer. Preserve the saved appearance field and migrate each existing value to a compatible new character preset without resetting profile, economy, facilities or progress.

The appearance picker may continue to offer distinct body/outfit families, but all choices must share the new rendering standard, frame scale, lighting, perspective and animation contract. Clothing, hair and equipment should be visibly different; recoloring an identical silhouette is not sufficient.

A character's appearance is cosmetic. It must not change attributes, HP, Satiety, Stamina, Qi, Spirit Realm, Martial Soul, Spirit Rings, Arcanist Grade/Focus, economy or any other gameplay value.

## 5. Lighting, materials and atmosphere

- Establish one consistent key-light direction for each scene, with soft ambient fill and contact shadows beneath people, props and buildings.
- Use material-specific detail: stone grain and bevels, timber joints, roof tiles, fabric folds, metal highlights, foliage clusters and layered water reflections.
- Use restrained atmospheric depth: distant haze, soft light shafts, weather, moving water, foliage sway and spiritual effects. Effects must not obscure taps, actors, labels or status information.
- Prefer baked/high-quality artwork, small reusable overlays and a limited number of lightweight runtime effects over expensive full-screen filters or broad redraws.
- Region palettes can differ, but lighting, edge quality, perspective and material rendering must remain consistent.

## 6. App UI and illustrations

Apply the same art quality to character portraits, profile panels, item illustrations, equipment, Spirit Ring frames, Martial Soul and skill icons, currency emblems, facility cards, map markers, HUD panels and contextual activity windows.

- Keep the established navigation hierarchy and approved interaction behaviour unless a separate UI decision changes them.
- Upgrade icons from text glyphs or generic geometric placeholders to individual illustrated emblems with strong small-size silhouettes.
- Use layered material surfaces—dark lacquer, stone, jade, aged metal, fabric or parchment—according to the screen's purpose. Do not cover every screen with the same heavy frame.
- Preserve clear contrast, readable typography, touch-safe controls and compact one-hand mobile layouts.
- UI artwork is decorative only; numbers, locks, requirements, timers and transaction states must continue to come from authoritative saved data.

## 7. Asset pipeline and performance

- All runtime art must be bundled locally in the APK. No map, character, texture, portrait or animation may require a remote request to appear.
- Replace the current pixel-only asset output as the final visual source. The existing PXL source can remain as a historical/prototype reference during migration, but new final assets must follow this document.
- Use packed atlases, shared materials, reusable object families and lazy loading by active scene. Avoid loading every region and every character animation at once.
- Keep map data, visual assets, gameplay state and interaction geometry separate. Asset IDs must be stable so visual upgrades do not change item, facility, character or save identities.
- Profile texture memory, scene load time, frame pacing, zoom quality and touch response on the TECNO Spark Go 1 KL4. Use reduced-detail fallbacks for distant/small objects rather than making the whole scene blurry.
- Never claim visual or device validation from source inspection alone. Record the exact build and physical-device result after testing.

## 8. Acceptance checklist

- [ ] Home Base reads as an elevated, layered isometric world rather than a flat pixel board.
- [ ] Ground, water, paths, buildings, props, characters and foreground objects have clear depth and consistent perspective.
- [ ] Player and seeded NPCs are full-body, individually identifiable and visually consistent.
- [ ] Eight-direction idle and walk loops preserve scale and the ground-contact pivot.
- [ ] Character scale is believable beside buildings, doors and facilities.
- [ ] Tapping NPCs, facilities, resources and valid map locations still invokes the existing location-based interaction rules.
- [ ] Existing saves, appearance values, facility positions, economy transactions and progression survive the visual migration.
- [ ] All runtime assets are packaged offline and the scene remains responsive on the target Android device.
- [ ] The existing Home Base navigation, Back behaviour and touch controls remain functional.
