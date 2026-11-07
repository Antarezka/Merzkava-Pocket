# Merzkava Pocket — Game Simulation Concept

**Status:** Core gameplay direction  
**Scope:** Game mode, isometric scene model, location interactions, travel, daily simulation, and local data requirements.  
**Document role:** Product/design reference. This document defines the intended experience and implementation order; it does not select a game engine or finalize every gameplay mechanic.

---

## 1. Core concept

Merzkava Pocket uses a **2D Isometric Location-Based Simulation**.

It is **not** a conventional free-roam RPG. The player does not steer a character continuously through an unrestricted map using a virtual joystick. Instead, the player sees a broad isometric area containing buildings, facilities, NPCs, environmental details, and ongoing activities. Visible locations and entities are interactive: the player taps one to inspect it or open its available interactions.

The simulation is organized around **where the player is, what exists at that location, what is happening at the current time, and which actions or routes are available**.

### Design principles

1. **Location first.** The area/scene and its points of interest are the primary navigation surface.
2. **Tap to interact.** Buildings, facilities, people, objects, and activity markers can open contextual information or actions when supported.
3. **Travel is a deliberate action.** Moving to another scene uses a valid route and a travel method such as going on foot or riding a horse. It is not unrestricted free movement across the map.
4. **Time matters.** Schedules, daily activities, and world events are evaluated against the in-game calendar and local time.
5. **The world persists locally.** Player progress and simulation state must be saved in a local database.
6. **Canon stays authoritative.** Merzkava Universe provides the established world, locations, transport, and economy foundations. Pocket-specific mechanics must not silently rewrite that canon.

---

## 2. Game screen layout

The following wireframe is a layout reference, not a final visual asset. “Tianhai Campus” is an example label only; it must not be treated as a newly established canon location merely because it appears here.

```text
╭────────────────────────────────────╮
│  TIANHAI CAMPUS (example)       ☰  ◈│
│  Day 08 · Morning                  │
│  xc   xs   xg   zj   az            │
│                                    │
│                                    │
│         ISOMETRIC WORLD            │
│                                    │
│          [ CORE ACADEMY ]          │
│                 ◆                 │
│                                    │
│    [ GARDEN ]       [ DOJO ]       │
│        ◆               ◆           │
│                                    │
│   [ STUDENT ]    [ PONDS ]         │
│      QUARTER           ◆           │
│                                    │
│          [ MAIN GATE ]             │
│                 ◆                 │
│                                    │
│   Forest perimeter · River         │
│                                    │
│────────── LOCATION PANEL ──────────│
│  OVERVIEW  PEOPLE  ACTIVITIES  →   │
│                                    │
│  Selected location information     │
│                                    │
╰────────────────────────────────────╯
```

### Screen regions

| Region | Responsibility |
|---|---|
| **Top identity bar** | Current area/scene name and access to the Game menu or secondary controls. |
| **Calendar and time** | Current in-game day and time period; the exact date/time representation follows the chosen calendar model. |
| **Wallet strip** | The five canon Xuan denominations: `xc`, `xs`, `xg`, `zj`, and `az`. |
| **Isometric world** | The area artwork: terrain, buildings, facilities, NPCs, objects, and environmental activity. |
| **Interactive locations** | Tap targets attached to supported buildings, facilities, people, objects, or points of interest. |
| **Location panel** | Contextual information and actions for the currently selected location/entity. |

The isometric world should remain the dominant visual surface. The lower panel presents details without replacing the area view with a separate list-first interface.

### Location panel tabs

- **Overview** — identity, purpose, description, access state, and relevant contextual details.
- **People** — NPCs known to be present or associated with the selected location, with availability based on time and current state.
- **Activities** — actions, services, schedules, and events that are actually available at that location.

The panel may show additional contextual actions when a selected entity supports them. Do not display inactive or invented actions simply to fill space.

---

## 3. World and scene structure

Use a hierarchy that separates the broad world map from the detailed playable area:

```text
WORLD
└── REGION
    └── AREA / SCENE
        ├── Terrain and environmental layers
        ├── Buildings and facilities
        │   └── Interactive locations / hotspots
        ├── NPCs and their current presence
        ├── Objects and points of interest
        └── Activities and local events
```

- A **region** groups related areas and their route relationships.
- An **area/scene** is the isometric view currently presented to the player.
- A **location/hotspot** is a selectable place or entity inside that scene.
- A **scene transition** changes the active area after a valid travel action is resolved.

The scene is not a blank tile field for unrestricted character steering. Isometric artwork communicates spatial arrangement and makes places recognizable. Touch targets provide the interaction layer.

Buildings and facilities should be authored with clear footprints and interaction bounds. NPCs and ambient activities should appear in positions that make sense for the scene layout. The visual position of an entity and its interaction target must stay aligned.

---

## 4. Main interaction flow

The normal interaction loop is:

1. **Enter Game.** Load the player's last valid scene or the appropriate starting scene.
2. **Load the area.** Resolve the scene definition, local time, visible locations, NPC presence, and current activities from local game data.
3. **Present the isometric view.** Render the environment and its supported interactive elements.
4. **Select a location or entity.** The player taps a building, facility, NPC, object, or activity marker.
5. **Open the Location Panel.** Show the relevant Overview, People, and Activities information.
6. **Choose an available interaction.** The game validates requirements, access, time, and the player's current state.
7. **Resolve the action.** Apply its result and time cost only when the action succeeds or otherwise produces a defined outcome.
8. **Refresh the scene and panel.** Update visible presence, activity availability, relevant state, and the wallet/inventory when affected.
9. **Save local state.** Persist meaningful changes so the session can be resumed.

```text
ENTER GAME
    ↓
LOAD LAST VALID AREA
    ↓
RENDER ISOMETRIC SCENE
    ↓
TAP LOCATION / NPC / OBJECT
    ↓
OPEN LOCATION PANEL
    ↓
SELECT AVAILABLE ACTION
    ↓
VALIDATE → RESOLVE → UPDATE TIME & STATE
    ↓
REFRESH SCENE → SAVE LOCALLY
    ↺
```

---

## 5. Travel and scene-to-scene movement

Travel is a **route-based transition between locations/scenes**, not free-roam movement.

A player may travel on foot, ride a horse or another established mount/transport, or use another mode when the route, location, access, and world canon support it. The selected mode determines the travel presentation and may affect duration, availability, cost, or risk only where those values are defined.

### Travel flow

1. Open the destination or route selection from the current area.
2. Show only destinations connected by an established or valid in-game route.
3. Display available travel methods for that route. Examples include:
   - On foot / walking.
   - Horseback or another domesticated/trained riding beast.
   - Caravan or other land transport.
   - Boat, ship, flying ship, aircraft, or regional transit where canon and route data permit.
4. Show known route information: origin, destination, intermediate stops, restrictions, and any verified duration or cost.
5. The player confirms the trip.
6. Enter a **Travel / Transition state**. Present the journey using an appropriate transition scene or short travel sequence; the character may be shown walking, riding, or using the selected transport.
7. Advance time and resolve travel effects, interruptions, or encounters according to the applicable rules.
8. On completion, load the destination scene and update the player's current location.
9. Save the completed location change and resulting state locally.

```text
CURRENT SCENE
    ↓
CHOOSE DESTINATION
    ↓
VALIDATE ROUTE & ACCESS
    ↓
CHOOSE AVAILABLE TRANSPORT
    ↓
CONFIRM JOURNEY
    ↓
TRAVEL / TRANSITION PRESENTATION
    ↓
RESOLVE TIME, EVENTS & OUTCOME
    ↓
LOAD DESTINATION SCENE
    ↓
SAVE NEW LOCATION
```

### Travel constraints

- A destination must be reachable through a connected route; do not teleport the player to an unrelated scene.
- A transport option must exist in the world and be accessible to the player. Do not assume the player owns a horse, has a mount, or can board restricted transport.
- Walking and horseback travel are supported concept directions, but exact speed, duration, stamina costs, fares, and other numerical rules must come from approved data. Do not invent them.
- Preserve origin, destination, route, selected transport, departure time, arrival time, and unresolved travel state where needed for continuity.
- If a journey is interrupted or still in progress, do not mark the destination as reached prematurely.
- The travel presentation can show the character moving between scenes, but it does not introduce a freely steerable open-world character controller.

For route and transport canon, consult the Merzkava Universe sources listed under [Canon and data boundaries](#10-canon-and-data-boundaries).

---

## 6. Time, daily life, and world events

The simulation has a persistent in-game calendar and local time. Time is not merely decorative text in the header: it determines which people, services, activities, and events may be available.

### Daily life

Daily Life organizes time-based routines and schedules, such as:

- Facility or service availability.
- NPC presence and routine changes.
- Scheduled classes, work, practice, public activities, or rest periods where established.
- The player's available daily activities and their time requirements.

A schedule is a source of availability, not a guarantee that an NPC or activity will always be accessible. Current location, access conditions, interruptions, and recorded world state still apply.

### World events

World Events represent activities and incidents that occur according to time, location, prerequisites, and world state. They may be:

- Scheduled events.
- Recurring local activities.
- Conditional events triggered by a valid state or prerequisite.
- Unplanned encounters or incidents supported by the active world rules.

An event should have a location or scope, valid time window or trigger, conditions, visible status, and a defined outcome. The scene and Location Panel should reveal only information the player could currently observe or access.

Do not generate arbitrary events simply to keep the screen busy. A quiet scene is valid when no relevant activity is taking place.

---

## 7. Inventory, materials, assets, and economy

Inventory is the player's record of carried items, materials, and other supported property. Assets are persistent records of things the player owns or controls when the applicable game system allows them.

The interface should distinguish, when relevant:

- **Items** — usable or collectible possessions.
- **Materials** — resources used by supported activities or production systems.
- **Assets** — persistent property or facilities with an established ownership record.
- **Wallet** — the five canon Xuan denominations.

The canon denomination labels are:

| Denomination | Code |
|---|---|
| Xuan Copper | `xc` |
| Xuan Silver | `xs` |
| Xuan Gold | `xg` |
| Zun Jade | `zj` |
| Ancient Zun | `az` |

Displaying the denominations does not authorize Pocket to invent prices or financial mechanics. Item prices, service fees, construction costs, production costs, asset upkeep, and new transaction rules must be separately specified and approved before implementation.

Any inventory, wallet, or asset change must come from a defined transaction or gameplay result and must be saved in the local database. Do not silently deduct currency or create ownership.

---

## 8. Local persistence and simulation data

The game requires its **own local database** for player/session state. The database is separate from the isometric rendering engine and must persist independently of a screen being open.

### Data groups

| Data group | Examples |
|---|---|
| World definitions | Regions, areas/scenes, route connections, terrain and location identifiers. |
| Scene content | Building footprints, visual layers, hotspots, objects, NPC placement, and environmental elements. |
| Location state | Access conditions, current activity state, relevant changes, and available interactions. |
| NPC simulation | Profiles/references, current location, presence, schedule state, and recorded changes. |
| Calendar and events | Current date/time, schedules, event triggers, active events, and resolved outcomes. |
| Travel state | Origin, destination, route, transport, departure, arrival, and journey status. |
| Player state | Current scene, character state, inventory, materials, assets, and five-denomination wallet. |
| Save metadata | Save identity, schema version, last update, and recovery information. |

### Persistence requirements

- Save meaningful changes locally and resume from the last valid state.
- Keep world definitions separate from mutable player/session state.
- Use stable IDs for scenes, locations, NPCs, items, routes, and events; do not use visible display names as database identity.
- Make state changes transactional where multiple records must change together.
- Include a data/schema version so future builds can migrate saved data safely.
- Support offline play for already available local content and saved state. Any later online content refresh must not silently overwrite valid local progress.
- Keep imported Merzkava Universe canon data distinguishable from player-created or session-specific state.

---

## 9. Engine and production requirements

This concept requires a **game engine** for the isometric game layer and a **local database** for simulation state. The current Android/WebView shell is not itself the game engine.

The engine layer will be responsible for:

- Isometric scene rendering and camera presentation.
- Layer order, depth sorting, object footprints, and draw ordering.
- Rendering building, environment, NPC, and object artwork.
- Hit testing and touch interaction for locations and entities.
- Scene transitions and travel presentation.
- Animation for ambient life, NPC activity, and travel sequences.
- Efficient asset loading and memory use on lower-end Android devices.

The local data layer will be responsible for:

- Loading scene and location definitions.
- Querying NPC presence, schedules, and activities.
- Resolving time-based events and travel state.
- Updating inventory, materials, assets, and wallet records.
- Saving and restoring player/session progress.

**Engine selection is intentionally not specified here.** It must be chosen after testing a representative isometric scene, touch interactions, asset pipeline, Android performance, and compatibility with the local database. Do not add a game-engine dependency or build an assumed free-roam controller before that evaluation.

---

## 10. Canon and data boundaries

Merzkava Universe remains the source for established setting facts. Pocket translates those facts into a playable simulation; it does not rewrite them.

Relevant canon references include:

- `world/GEOGRAPHY_AND_TRAVEL.md` — world geography and established transport types.
- `world/LOCATION_AND_ROUTE_NETWORK.md` — route connections, route status, transport, and travel validation.
- `world/MAP_AND_REGIONS.md` and the applicable regional modules — world and regional location context.
- `gameplay/TIME_AND_ACTION_RULES.md` — action duration and time advancement.
- `gameplay/TRAVEL_ENCOUNTER_AMBUSH_RESCUE.md` — travel encounter and ambush procedures where applicable.
- `core/10_ECONOMY_SYSTEM.md` — canon currency and economy authority.

### Must not be invented by the implementation

Unless separately specified and approved, do not invent:

- Exact travel speed, travel duration, or transport fares where the canon leaves them unknown.
- Building purchase prices, construction costs, upkeep, or material requirements.
- New relationship points, affinity formulas, romance values, reputation formulas, or social progression mechanics.
- NPC schedules, event outcomes, or location access that have not been established by data or an approved game rule.
- Ownership, inventory, wallet deductions, or rewards without a valid recorded result.

When a value is unknown, represent it as unknown or leave the dependent interaction unavailable. Do not fill data gaps with arbitrary numbers.

---

## 11. Recommended implementation order

The work should proceed in dependency order. Build the data and interaction contract before producing a large amount of map artwork.

| Stage | Deliverable | Dependency / completion check |
|---|---|---|
| **01 — Game foundation** | Select and validate the engine; define the local database boundary and stable ID strategy. | A small Android prototype can load and save local game state. |
| **02 — Scene data contract** | Define area/scene, location, footprint, hotspot, object, and layer metadata. | One test scene can be described without hard-coding its objects into the UI. |
| **03 — Isometric scene prototype** | Render one representative area with buildings, terrain, environmental layers, and touch targets. | Visual scale, depth order, footprints, and touch alignment work on the target phone. |
| **04 — Location interaction** | Build the contextual Location Panel with Overview, People, and Activities. | Selecting a scene element opens the correct information and available actions. |
| **05 — NPC and daily simulation** | Connect NPC presence, routines, services, and activity availability to local time. | The same scene can display different valid states at different times. |
| **06 — Travel and scene transitions** | Add route validation, walking/horseback/other available transport, travel state, and arrival handling. | A player can travel only through a valid route and resume safely after interruption. |
| **07 — World events** | Add scheduled and conditional events with visible status and recorded outcomes. | Events resolve once under their valid conditions and remain consistent after reload. |
| **08 — Inventory and economy** | Add item/material/asset records and the five-denomination wallet display and transactions. | Every state change has a defined source and is saved locally. |
| **09 — Persistence and content expansion** | Validate migrations, recovery, offline behavior, and repeatable scene authoring. | Multiple scenes and sessions can be loaded without losing state or inventing canon. |

### First production sample

Use one representative area as a **technical and visual sample**, not as a declaration that every planned building or facility is already canon. It should prove:

- A complete isometric environment with clear object footprints.
- Several selectable locations with distinct interaction bounds.
- A working Location Panel.
- At least one NPC with time-dependent presence.
- One valid travel route to another scene, including a travel-mode presentation.
- Local save and reload of current location and changed state.

Only after this sample works should the same scene/data method be expanded to other areas.

---

## 12. Explicit non-goals

The intended game is not:

- A free-roam RPG controlled by a virtual joystick.
- A continuous open-world character movement system.
- A collection of unrelated static menus pretending to be a living location.
- A teleport-based scene selector that ignores route connections and travel time.
- A source of new Merzkava canon, prices, or social mechanics without approval.

**Product identity:** a persistent, time-aware, isometric world simulation where the player explores places through location interactions and deliberate travel.
