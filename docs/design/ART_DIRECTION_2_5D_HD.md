# Merzkava Pocket — 2.5D HD Isometric Art Direction

**Decision date:** 2026-11-07  
**Status:** Approved visual direction · runtime implementation pending  
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
- Expand the playable scene well beyond one phone viewport. The first expanded Home Base target is at least **24×20 isometric cells**—four times the current 12×10 prototype's cell count—with room for connected neighbourhoods, terrain, paths, facilities, landmarks and undiscovered space. The map must not feel like a tiny board stretched to fill the screen.
- The camera shows only a readable portion of the world. Support smooth, bounded drag-panning and deliberate zoom; retain a useful player/scene focus when entering an area. The map itself stays larger than the viewport and must not be rescaled to fit every cell on screen at once.
- Keep the world visually rich but uncluttered. A mobile player must be able to distinguish a path, open tile, building entrance, NPC and resource node at normal phone scale.
- Movement remains location-based. Tapping a valid revealed location calculates a safe route across the walkable map graph, follows the path around blocked terrain and occupied cells, and animates the actor continuously along the route. Do not use a straight-line tween through obstacles. Camera panning is map inspection, not a new free-roam control mode.

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
- Idle and walk are mandatory for all eight headings. Target at least 8–12 frames per idle loop and 8–12 frames per walk cycle at 10–14 FPS for the first HD character pack; use more frames when the action requires it. The animation must read as continuous body motion, not a repeated two-pose bob.
- Walk cycles must show alternating foot contact, passing and lift phases, believable weight transfer, counter-swinging arms, torso response and cloth/hair/accessory follow-through. Foot planting must stay aligned to the ground plane so the character does not skate while the body moves.
- Direction changes use a short turn/transition when the heading changes substantially. Do not instantly swap from one diagonal pose to the opposite direction while the actor is moving.
- Movement transitions support idle → start/anticipation → walk → deceleration/stop → idle. Short moves must not skip into a visibly incomplete walk loop; longer moves must not snap the actor to the target before the feet finish their final contact.
- Add distinct clips when relevant: turn-in-place, talk/listen, gather/pick-up, carry, work/craft, sit/rest, spar/attack, cast/skill, hit-react, stagger, hurt and death. Only expose clips that the corresponding gameplay action actually supports.
- Animation playback is frame-rate independent from movement distance and simulation time. The walk cycle follows actor movement speed; animation must not change the authoritative movement target or simulation clock.
- Character motion should feel like a polished RPG: eased acceleration and deceleration, continuous positional interpolation, natural footwork, stable ground contact, readable direction changes and layered secondary motion. Keep the underlying game location-based; this visual/motion standard does not silently add unrestricted free-roam controls.
- Use a fixed frame canvas, transparent background and stable bottom-centre foot-contact pivot across every direction and animation. Hair, robes, weapons and accessories may extend beyond the body silhouette but must not move the ground pivot.
- Keep the ground shadow separate from the character body so it can be scaled and composited with the map.
- Artwork never intercepts gameplay input. Existing scene hit areas and interaction handlers remain separate from transparent sprite pixels.

### Modular character customization

The character is built from a persistent base body plus independently replaceable appearance/equipment layers. Do not bake the complete outfit, hairstyle and accessories into one inseparable character sheet.

**Minimum independently addressable appearance slots:**
- Hair style, including back-hair and front/fringe layers where the design requires them.
- Headwear and hair ornaments.
- Face details and facial hair where applicable.
- Inner top/undershirt.
- Main top, robe, coat, mantle or chest armour.
- Bottoms, trousers, skirt or lower robe.
- Footwear.
- Waist sash, belt, pouch and hanging ornaments.
- Neckwear, earrings and other jewellery.
- Gloves, bracers and hand accessories.
- Back attachments such as capes, packs, banners or sheathed weapons.
- Main-hand and off-hand weapon/tool attachments where supported.
- Optional species/body traits (ears, horns, tail, wings and similar anatomy) as identity/body layers, not ordinary clothing.

A one-piece robe or armour set may occupy multiple visual regions but must be represented by an explicit outfit definition that resolves its coverage and prevents incompatible pieces from clipping through one another. Slot compatibility is data-driven; do not hard-code visual assumptions from an item's name.

**Layering and attachment rules:**
- Use a stable character rig/attachment map with named anchors for head, hair, face, neck, shoulders, torso, waist, hands, back and feet.
- Split hair into rear/front passes when needed. Headwear may hide or reshape only the hair sections it actually covers; it must not erase the entire hairstyle by default.
- Render equipment in a direction-aware order so arms, sleeves, weapons, scabbards, capes and hair pass correctly in front of or behind the body for all eight headings.
- Every attachable asset must declare its anchor, local offset, draw layer, coverage mask, supported directions, animation set and compatibility tags. Do not align equipment by manually nudging individual frames.
- Clothing and accessories must inherit the body animation without detaching during turns, steps, attacks or interaction. Long sleeves, robe hems, hair, ribbons and capes receive secondary follow-through while keeping the foot pivot stable.
- Swapping one slot must not redraw or replace unrelated slots. Reuse compatible atlas/material resources and compose the visible character from the currently equipped layers.
- If a cosmetic asset has no compatible direction or action animation, show a deliberate compatible fallback or block that combination; never stretch, mirror an unsuitable view or silently drop the item.

**Appearance versus functional equipment:**
- Character appearance slots and functional equipment slots are separate concepts. A functional item may grant only the gameplay effects specified by its approved Pocket/Universe data.
- A cosmetic/vanity appearance may override the visible look without changing the underlying equipped item's stats, requirements, ownership, durability or transaction record. The visible override must be saved separately.
- Hair, clothing dyes, ornaments and costume changes are cosmetic unless a specific approved item record says otherwise. A visual change must never grant HP, defence, attack, attributes, Spirit Realm, Martial Soul, Spirit Rings, Arcanist Grade/Focus or currency.
- Allow the Player to save and restore named outfit/appearance presets. Presets store stable asset IDs and slot choices, not flattened screenshots or copied character sprites.
- Provide a live preview before applying changes. The preview must support front, side, back and diagonal views, and show how the selected pieces layer together during idle and movement.
- NPC outfits use the same modular composition system, but their appearances are authored by their role, identity and schedule; changing the Player's outfit must not recolour or overwrite NPCs.

**Reference fidelity and originality:**
- Use the privately approved character reference board as a strict quality benchmark for body proportions, silhouette clarity, face/hair rendering, costume construction, armour/accessory detail, material shading, pose readability and animation polish.
- Review reference fidelity at the same camera distance and in-game scale used by Pocket. A beautiful close-up portrait is not sufficient if the field character becomes an unreadable blob at normal zoom.
- Translate the benchmark into original Merzkava characters, clothing patterns, ornaments, weapons and silhouettes. Do not trace, recreate or ship another game's identifiable character, exact costume, proprietary sprite, logo or artwork.
- Keep the private source titles and links out of repository documentation, code comments, commit messages, public asset prompts and release notes.

## 4. Character appearance and save compatibility

The old appearance values are legacy save data, not permission to keep the old pixel renderer. Preserve the saved appearance field and migrate each existing value to a compatible new character preset without resetting profile, economy, facilities or progress.

The appearance picker must become a modular character studio rather than only a five-family style selector. Preserve legacy appearance keys for save migration, but map them into compatible body/outfit presets using the modular slot contract above. The Player can change hair, headwear, garments, bottoms, footwear, accessories, weapons/tools and other supported attachments independently, preview combinations before saving and restore saved outfit presets. Each selected asset must preserve the shared rendering, frame scale, lighting, perspective, rig anchors and eight-direction animation contract. Clothing, hair and equipment must visibly change the model silhouette and detail; recolouring an identical silhouette is not sufficient.

A character's appearance is cosmetic. It must not change attributes, HP, Satiety, Stamina, Qi, Spirit Realm, Martial Soul, Spirit Rings, Arcanist Grade/Focus, economy or any other gameplay value.

## 5. Lighting, materials and atmosphere

- Establish one consistent key-light direction for each scene, with soft ambient fill and contact shadows beneath people, props and buildings.
- Use material-specific detail: stone grain and bevels, timber joints, roof tiles, fabric folds, metal highlights, foliage clusters and layered water reflections.
- Use restrained atmospheric depth: distant haze, soft light shafts, weather, moving water, foliage sway and spiritual effects. Effects must not obscure taps, actors, labels or status information.
- Prefer baked/high-quality artwork, small reusable overlays and a limited number of lightweight runtime effects over expensive full-screen filters or broad redraws.
- Region palettes can differ, but lighting, edge quality, perspective and material rendering must remain consistent.
- A single Pocket Simulation Clock drives time-of-day for all scenes. The visual cycle is continuous and should pass through dawn, morning, noon, afternoon, dusk and night without abrupt palette swaps. At ×48, one complete 24-hour Pocket day corresponds to 30 real minutes; this is a presentation readout of the authoritative simulation clock, not a second visual-only clock.
- Daylight must change the complete scene composition: sky/horizon gradient, upper-sky brightness, ambient fill, directional sunlight, shadow length/direction, material warmth, water highlights, foliage response and atmospheric depth. The light source should read as coming from the sky above the playable world, not as a flat colour filter placed over the map.
- Animate the sun's apparent path from the morning/eastern sky toward the afternoon/western sky. Use soft volumetric shafts that descend from the upper sky through clouds and gaps in foliage. At dusk, fade warm sunlight and activate windows/lanterns; at night, use a cool moonlit fill with restrained stars and local warm light sources.
- Clouds move slowly across the upper sky plane and may cast soft moving shadows across the terrain. Separate cloud, sun, sky, fog and map-light layers so weather and time can be blended without repainting the world every frame.
- Layer atmospheric mist/haze from the distant horizon toward the foreground. Fog density may respond to local weather, time and terrain (especially water, valleys and forests); it should reveal depth rather than obscure interaction targets. Weather effects remain separate from vision/fog-of-war visibility.
- All lighting and atmosphere must update from the shared world-time and weather state. Closing/reopening the app must resume the correct visual phase from saved simulation time instead of restarting at dawn.

## 6. Exploration visibility and fog of war

Use a strategy-game-style visibility system to make the expanded world feel discovered rather than fully exposed from the start. The fog is a dedicated world-visibility layer and is separate from weather mist or atmospheric haze.

- **Unexplored:** distant/undiscovered map space is covered by opaque near-black fog. Terrain detail, buildings, NPCs, resources, labels, interaction markers and live activity must not show through it.
- **Explored but not currently visible:** areas revealed in the past remain on the map as a darkened, low-saturation memory. Preserve only last-known/static map information; do not display live NPC positions, current resource state or activity that the player cannot currently see.
- **Currently visible:** the area around the Player is fully revealed with normal scene colour, lighting, objects, NPCs, resources and valid interaction hotspots.
- Visibility expands smoothly as the Player approaches and moves through the map. The reveal edge uses a soft, irregular radial falloff that follows the isometric ground plane, not a hard circular UI spotlight. The reveal should feel like active scouting or scanning across the terrain.
- Use the Player's current ground position as the default vision source. Additional vision sources such as an approved scout, companion, elevated observation point or temporary scan action may contribute only when the gameplay system explicitly supports them.
- Vision radius and any terrain/elevation modifiers are map/actor configuration, not values inferred from artwork. Do not let a visual reveal bypass access, collision, placement or gameplay Requirements.
- Save explored cells/regions per Pocket character and map ID. Reopening the same save preserves discovered territory; entering a new map starts from that map's recorded discovery state.
- Unexplored fog must not block the map's touch surface globally. Taps on hidden space return a neutral unavailable response and never reveal hidden labels or contents. Player movement/pathfinding can target only currently revealed, valid walkable ground or a known interaction destination.
- Keep fog state independent from day/night and weather. Night can darken visible terrain through lighting, but it must never reset exploration; bright daylight must not reveal unexplored terrain.
- Update the visibility mask only when a vision source changes cells or a relevant visibility rule changes. Do not redraw the entire world every animation frame or place expensive blur/filter passes across the whole map.

## 7. App UI and illustrations

Apply the same art quality to character portraits, profile panels, item illustrations, equipment, Spirit Ring frames, Martial Soul and skill icons, currency emblems, facility cards, map markers, HUD panels and contextual activity windows.

- Keep the established navigation hierarchy and approved interaction behaviour unless a separate UI decision changes them.
- Upgrade icons from text glyphs or generic geometric placeholders to individual illustrated emblems with strong small-size silhouettes.
- Use layered material surfaces—dark lacquer, stone, jade, aged metal, fabric or parchment—according to the screen's purpose. Do not cover every screen with the same heavy frame.
- Preserve clear contrast, readable typography, touch-safe controls and compact one-hand mobile layouts.
- UI artwork is decorative only; numbers, locks, requirements, timers and transaction states must continue to come from authoritative saved data.

## 8. Asset pipeline and performance

- All runtime art must be bundled locally in the APK. No map, character, texture, portrait or animation may require a remote request to appear.
- Replace the current pixel-only asset output as the final visual source. The existing PXL source can remain as a historical/prototype reference during migration, but new final assets must follow this document.
- Use packed atlases, shared materials, reusable object families and lazy loading by active scene. Avoid loading every region and every character animation at once.
- Keep map data, visual assets, gameplay state and interaction geometry separate. Asset IDs must be stable so visual upgrades do not change item, facility, character or save identities.
- Profile texture memory, scene load time, frame pacing, zoom quality and touch response on the TECNO Spark Go 1 KL4. Use reduced-detail fallbacks for distant/small objects rather than making the whole scene blurry.
- Never claim visual or device validation from source inspection alone. Record the exact build and physical-device result after testing.

## 9. Acceptance checklist

- [ ] Home Base reads as an elevated, layered isometric world rather than a flat pixel board.
- [ ] Ground, water, paths, buildings, props, characters and foreground objects have clear depth and consistent perspective.
- [ ] Player and seeded NPCs are full-body, individually identifiable and visually consistent.
- [ ] Eight-direction idle and walk loops preserve scale and the ground-contact pivot, with planted foot contacts and smooth start/stop/turn transitions.
- [ ] The expanded Home Base reaches at least 24×20 cells and supports bounded map panning without shrinking the world to fit the phone screen.
- [ ] Valid movement follows walkable routes and does not slide through blocked or occupied terrain.
- [ ] Day/night composition follows the shared ×48 Pocket Simulation Clock and updates sky, light direction, shadows, clouds, water and atmosphere.
- [ ] Upper-sky clouds, sunlight shafts and layered atmospheric haze animate subtly without obscuring the playable map.
- [ ] Fog of war distinguishes unexplored black space, explored dim space and currently visible terrain; discovery persists per character and map.
- [ ] Character scale is believable beside buildings, doors and facilities.
- [ ] Tapping NPCs, facilities, resources and valid map locations still invokes the existing location-based interaction rules.
- [ ] Existing saves, appearance values, facility positions, economy transactions and progression survive the visual migration.
- [ ] All runtime assets are packaged offline and the scene remains responsive on the target Android device.
- [ ] The existing Home Base navigation, Back behaviour and touch controls remain functional.
