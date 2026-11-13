# Merzkava Pocket — Game Mode Architecture (portrait, offline)

**Status:** Implementation contract for the Game Mode rebuild.
**Runtime root:** `review-apk/web/src/game/`
**Supersedes:** the Phaser/Augusto-PXL Home Base prototype (`home-base.js`, `art/*.px.js`, `build-world-assets.mjs`, PXL preview workflow).

## 1. Shape of the feature

Pressing **Game** in the dock enters a dedicated, full-screen, portrait **Game Mode**. It hides the app shell (header, dock, pull-cord) and owns the screen until the player exits.

Flow: `Loading scene → Main menu (New Game · Continue · Options · Exit) → [Character creator] → Home map`.

- **Continue** is shown only if a save exists for the current identity.
- **Exit** always asks one confirmation panel before leaving Game Mode.
- **Options** are Game-Mode-only (graphics, performance, audio) and never change the app shell settings.
- Name rule: signed in as a *player* → the player's name is used and locked. Signed in as *developer* → the name is typed in the creator.
- Developer sessions also get a **Developer Console** (item/facility database browser, grants, clock skip, reset). Player sessions never see it.

## 2. Engine decision

Custom, dependency-free **Canvas 2D engine** (`engine/`). Reasons: tap-only input, top-down camera, painted pre-baked art, ~zero bundle weight, deterministic baking, and it runs and is testable without an npm install. Phaser is no longer a dependency.

Art is **procedurally painted by our own code at build/first-run time** (no PXL, no external art). High-detail art is *baked* to canvases/sprite sheets once, then used like a classic sprite game (grid map, y-sorted sprites, frame animation).

Visual direction: *cultivation-world painting* — soft gouache / ink-wash, warm autumn foliage that varies tree to tree (peach, apricot, burnt orange, rust, ochre, olive, jade, deep teal pine), drifting mist, thin plum-brown linework instead of black outlines (`#3a2a3c` @ ~60 %), warm rim light, faint paper grain. Never low-bit pixel art.

## 3. World constants

- `TILE = 64` art pixels. Map = `28 cols × 42 rows` (`1792 × 2688`). North is up.
- Clock: **×48**. `1 real second = 0.8 sim minutes`; **1 sim day = 30 real minutes**. Pocket currency is `xc` (100 xc = 1 xs, 100 xs = 1 xg). Opening balance 5 xc.
- Layout, north → south: far bank + forest edge → **winding river** (west edge to east edge, non-straight, stones in the stream, banks with reeds) → **house yard** (starter shack, upgradeable) → **overgrown field** (weeds, rocks, logs, stumps, muddy path, small pond) → south road.
- `claim` = the player's land rectangle (yard + field). Facilities can be placed on free land tiles inside `claim`. Free means: no prop, not water, not path/mud road. Clearing props by harvesting them makes ground buildable.
- Exits (south road, east trail, west trail) are placeholders: a dimmed region labelled **COMING SOON**.

## 4. Module contracts

All art functions are pure, seeded, and run in the browser. Use `art/paint.js` helpers (do not modify it).

### 4.1 `art/character.js`

```js
export const CHARACTER_OPTIONS = {
  gender:    [{id,name}],              // male, female
  body:      [{id,name,desc}],         // >= 6 proportion presets (height, shoulders, waist, limbs)
  head:      [{id,name,desc}],         // >= 6 head/face shapes
  skin:      [{id,name,color,shadow}], // >= 8
  eyes:      [{id,name}],              // >= 8 shapes
  eyeColor:  [{id,name,color}],        // >= 8
  expression:[{id,name}],              // >= 10: smile, wink, fierce, elder/aged, coquettish, handsome/cool, shy, sleepy, smirk, neutral ...
  fringe:    [{id,name,group}],        // >= 10 front bangs (include 'none')
  sideL:     [{id,name,group}],        // >= 8 left side bangs/locks (include 'none')
  sideR:     [{id,name,group}],        // same list as sideL, chosen independently
  hairBack:  [{id,name,group}],        // >= 14 back/length styles, group = 'eastern' | 'modern' | 'short'
  hairColor: [{id,name,color,shadow,light}], // >= 12 (natural + fantasy)
  outfit:    [{id,name,palette}],      // >= 6 eastern-fantasy outfits (gender-neutral names allowed)
  accessory: [{id,name}],              // >= 6 (none, hairpin, guan crown, ribbon, flower, headband, ...)
};
export function defaultAppearance(gender = "female") -> Appearance
export function randomAppearance(seed) -> Appearance
export function normalizeAppearance(a) -> Appearance     // fills missing/invalid ids with defaults
// Appearance = { gender, body, head, skin, eyes, eyeColor, expression, fringe, sideL, sideR, hairBack, hairColor, outfit, accessory }
export function drawPortrait(ctx, appearance, { x, y, w, h, bust = false, expression }) // front view, fitted into the box, transparent bg
export function drawPartThumb(ctx, slot, optionId, appearance, size)   // square thumbnail (size px) for option grids, any slot
export function bakeSheet(appearance, { scale = 1 })
  -> { canvas, cell:{w,h}, pivot:{x,y}, anims:{ idle_down, walk_down, idle_up, walk_up, idle_side, walk_side } }
  // each anim = array of {sx,sy}; side faces RIGHT (engine mirrors for left); walk >= 6 frames; pivot = feet centre.
  // cell default 128x176 at scale 1.
export function npcAppearance(id) -> Appearance          // 'merchant', 'steward' (quest giver), 'villager_a', 'villager_b'
```

Gender changes the base silhouette and defaults, but every hair/outfit/accessory option stays selectable for both genders.

### 4.2 `art/world.js`

```js
export const WORLD = { tile:64, cols:28, rows:42 };
export function buildHomeWorld(seed = 1337) -> {
  cols, rows, tile, width, height,
  ground,                 // canvas width x height : fully baked painted terrain (no props)
  tiles,                  // Uint8Array(cols*rows) terrain id: 0 grass,1 meadow,2 dirt,3 mud,4 water,5 shallows,6 bank,7 pond,8 yard,9 road,10 forest-edge
  blocked,                // Uint8Array(cols*rows) 1 = not walkable (deep water, far bank, map rim)
  props,                  // [{ uid, kind, variant, x, y, w, h, sprite, c, r, fc, fr, blocking:true|false, node:{kind,variant}|null, removable }]
                          //   x,y = feet pivot in world px; sprite is a canvas drawn with its pivot at (w/2, h); sort by y.
                          //   node.kind in: tree log stump rock boulder weed reed herb water fish
  home:  { uid, x, y, c, r, fc, fr, doorC, doorR },     // starter shack (see drawHouse)
  claim: { c0, r0, c1, r1 },                             // inclusive tile rect
  exits: [{ id, label, c0, r0, c1, r1 }],
  spawn: { c, r },
  fishSpots: [{ c, r }],
  drawWater(ctx, time, camX, camY, viewW, viewH),        // animated shimmer / flow overlay, cheap
  drawAmbient(ctx, time, camX, camY, viewW, viewH),      // optional drifting mist / petals / leaves
}
export function drawHouse(level)                     -> { canvas, w, h, fc, fr }   // level 1 shack, 2 cottage, 3 courtyard house
export function facilityFootprint(facility)          -> { w, h }                   // tiles, 1..3
export function drawFacility(facility, level = 1)    -> { canvas, w, h, fc, fr }   // pivot at bottom centre, family-specific painted motif (20 families)
export function drawConstructionSite(fc, fr)         -> canvas                     // scaffold / unfinished frame
export function drawCart()                           -> canvas                     // merchant's cart, bottom-centre pivot
export function drawMarker(kind)                     -> canvas                     // 'ping','target','sparkle' for tap feedback
```

### 4.3 `data/*` (pure logic, no DOM except `localStorage` through an injected storage)

```js
// catalog.js
export async function loadCatalog(baseUrl = "./data/", fetchImpl = fetch) -> Catalog
export function buildCatalog({ itemsA, itemsB, facilities, recipes }) -> Catalog     // used by tests / node
// Catalog = { items, itemById, facilities, facilityById, recipes, recipeById, byCategory,
//             toolMatches(requirementText)->itemId[], cropInfo(itemId), itemName(id),
//             price(id)->{base, shop, buyback}, facilityFamilies }

// clock.js    SIM_RATE=48; simNow(state), dayIndex(simMin), minuteOfDay(simMin), formatClock(simMin), realMsToSimMin, simMinToRealMs
// state.js    SAVE_VERSION, saveKey(identity), hasSave(identity, storage), createNewState({identity, name, appearance, catalog}), loadState(identity, catalog, storage), saveState(state, identity, storage), deleteSave(identity, storage)
// economy.js  class GameEconomy(catalog, state, { storage, identity })  — see §5
// merchant.js merchantForDay(catalog, dayIndex, state) -> { present, arriveMin, leaveMin, name, greeting, stock[], wanted[] }
// quests.js   dailyQuests(catalog, dayIndex, state) ; GameEconomy#questEvent(type, payload)
// art/icons.js drawItemIcon(ctx, item, size)  // procedural painted icon from category + name keywords
```

## 5. Economy rules the game layer must honour

- Source of truth is the shipped catalogue JSON (1,000 items, 200 facilities, 20 recipes). IDs and prices are never altered. Missing information is *derived deterministically from catalogue fields* (category, `acquisition.method`, `locations`, `tool_requirements`, facility `outputs`, `crop_seed_pairs`) and clearly marked; it is never invented as a free action. Anything that cannot be derived stays locked.
- Tool requirement strings (`"suitable axe"`, `"Hoe"`, `"Fishing Rod"`) are matched to real tool items through `catalog.toolMatches()`.
- Bag has slot capacity (stack limit 99); storages have their own capacity. Gathering respects the bag.
- Gather actions are tap → walk adjacent → timed action (≤ ~6 real seconds) → yield; nodes have `harvest_cap_per_tree` / respawn from catalogue where present.
- Facilities: placing needs `cash_fee_xc`, materials and builder tool; construction time = `duration_sim_minutes ÷ 48` real minutes (finish timestamp persisted). Level-ups use the catalogue `levels[].upgrade`.
- Merchant: arrives each sim day (morning), leaves in the evening. Shop price = `typical_shop_price_xc`; buyback = `typical_merchant_buyback_price_xc`; a daily seeded modifier and a "wanted today" list (premium buyback) apply. Stock is finite per day.
- Daily quests (3–4 per sim day) and a quest NPC (steward): gather, fish, forage, deliver, build, sell, visit merchant. Rewards = xc + items.
- Developer sessions: grants, clock skip, item browser. Player sessions: none of that.

## 6. Out of scope for this pass

Storyline, combat, Spirit Rings / Awakening runtime, travel to other maps, multiplayer. Exits only show **COMING SOON**.

## 7. Character base (supplied reference)

The procedural, code-drawn character was discarded. The base is the chibi mannequin from the supplied modular sheet (front/side/back cut-outs in `review-apk/web/src/game/art/base/`). Heads, eyes, expressions, hair parts, equipment and 8-direction walk frames are to be built as separate layers on top of it, at a quality target of 2x the reference sheet.

## 8. Art pipeline (offline tools, outputs committed)

`tools/art/` holds Python tools (OpenCV + NumPy, no network) that re-trace the supplied reference sheets into crisp, smooth, high-resolution assets. They are not part of the app build; only their PNG/JSON output is committed.

- `crisp.py` — background cut-out and palette-region re-trace (upscale, fixed-role palette, blurred one-hot argmax for smooth vector-like edges).
- `build_base.py` — builds the 8-direction chibi base (`review-apk/web/src/game/art/base/dir_{N,NE,E,SE,S,SW,W,NW}.png`) plus `dir_*_idx.png` role maps so skin tones can be palette-swapped at runtime, and `manifest.json`. W/SW/NW are mirrors of E/SE/NE. Clipped heads and feet from the reference frames are closed with outlined caps.

Not done yet: walk/idle rig, face parts, hair layers, outfits and world tiles.

### 8.1 Modular parts (user-supplied "Ronin" guide sheets)

- `extract_parts.py` + `regions_ronin_guide.json` cut hair heads (4 styles x front/side/back), outer robe (front/back), collars, hakama, red sash into `art/parts/ronin/` and re-trace them smooth with the shared plum-brown outline.
- `hair_only.py` removes the painted face from a hair head, so the face comes from the base; hair hanging below the chin splits into a back layer (behind the body) and a front layer.
- `compose_test.py` layers base + hakama + robe + sash + collar + tinted hair for visual checks. Hair is grey in the source and is tinted by luminance (shadow/base/light).
- Animation standard (from the supplied Ronin sprite sheet): 4-direction idle and walk, sword draw/slash, spell cast (charge and release), hurt, jump, crouch/kneel, sit, meditate, emotes.
- Known gaps: no 3/4 hair views (SE/SW/NE/NW fall back to front/back/side), residual eyelid lines on some heads, collar scale/placement needs tuning, stair-step edges from the pixel source need stronger smoothing, 5 of the 8 base directions have no matching robe/hakama views yet.
