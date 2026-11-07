# Merzkava Pocket — Game Simulation Concept

**Status:** Core gameplay direction  
**Scope:** Pocket game identity, isometric scenes, location interactions, micro-economy, real-time progression, Daily Login, time-integrity checks, and local persistence.  
**Document role:** Product and implementation reference. It defines the intended experience and work sequence. It does not select a game engine or finalize every activity, price, reward, or progression formula.

---

## 1. Product identity

Merzkava Pocket is a **lightweight 2D Isometric Location-Based Life Simulation** set within the world of Merzkava Universe.

It is designed to be visually pleasant, atmospheric, and comfortable to leave open and check throughout the day. The player builds a life through small activities, work, resource gathering, facilities, social relationships, learning paths, and gradual economic progress.

### Relationship to Merzkava APK

Merzkava APK and Merzkava Pocket are different experiences:

- **Merzkava APK** may use its own free-roam gameplay and direct character movement.
- **Merzkava Pocket does not inherit that free-roam control model.** Pocket focuses on area-based isometric simulation, selectable locations, contextual actions, and deliberate travel between scenes.

Do not add a virtual joystick or unrestricted walk-anywhere controller to Pocket merely because free-roam exists in Merzkava APK.

### Core principles

1. **Location-based interaction.** The player sees a broad isometric area containing buildings, facilities, NPCs, objects, terrain, and activities. Tap a visible point of interest to interact.
2. **Small, satisfying progress.** Activities should be understandable and manageable in short visits, while time-based tasks can continue between visits.
3. **A living presentation.** The world should feel worth looking at: ambient movement, changing light, weather or environmental details when supported, NPC presence, and visible activity changes.
4. **A flexible life simulation.** Players may gather, produce, sell, store, build, work, study, cultivate, and develop social links through paths supported by Merzkava.
5. **Real-time progression.** Construction, assigned work, production, recovery, and other approved timed processes use elapsed real-world time measured from the device, subject to time-integrity checks.
6. **Offline-first gameplay.** The main game loop, local scenes, saved state, and already available activities do not require a continuous internet connection.
7. **Online Daily Login.** Daily Login rewards require an internet connection so the service can check the claim-day and accepted-time-zone Requirements.
8. **Canon remains authoritative.** Merzkava Universe supplies established lore, geography, transport, currency, character systems, and organizations. Pocket-specific micro-economy and simulation rules must be defined separately without silently changing canon.

---

## 2. Game screen and visual layout

The following wireframe is a layout reference, not a final visual asset. “Tianhai Campus” is an example label only; it does not establish a new canon location.

```text
╭────────────────────────────────────╮
│  TIANHAI CAMPUS (example)       ☰  ◈│
│  Day 08 · 08:15                    │
│  HP 180/200  ▰▰▰▰▰▰▰▰▱▱           │
│  SAT 78/100   ▰▰▰▰▰▰▰▱▱▱           │
│  ENERGY: STAMINA · value per profile│
│  MORTAL · AWAKENED                 │
│  ARCANIST GRADE ??? · FOCUS —      │
│  xc   xs   xg   zj   az            │
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
| **Top identity bar** | Current area/scene name and secondary controls. |
| **Calendar and local time** | Current simulation date and time, derived from the accepted device-time timeline. |
| **Wallet strip** | The five Xuan denominations: `xc`, `xs`, `xg`, `zj`, and `az`. |
| **Isometric world** | The dominant view: terrain, buildings, facilities, NPCs, objects, and activity. |
| **Interactive locations** | Touch targets for supported places, people, objects, and activities. |
| **Location panel** | Contextual information and actions for the selected point of interest. |

The isometric area remains the visual focus. The lower panel should provide context without replacing the world with a list-first interface.

### Character quick-status HUD

The gameplay view must also expose a compact character-status strip without taking over the isometric canvas. The persistent quick view shows **HP current/maximum**, **Satiety/100**, **Stamina before Ring 1 or Qi after Ring 1**, **Mortal or exact Spirit Realm + Stage (and Awakening state when relevant)**, **Arcanist Grade**, **Arcanist Focus**, and the five-denomination Wallet. Tapping the character strip opens the expanded character drawer with Martial Soul, Awakening record, Ring slots and requirements, Sync, Qi, injury, equipment, skills, employment, social records, and Arcanistry details.

The exact states, values, and update rules are governed by [Pocket Progression and HUD](./POCKET_PROGRESSION_AND_HUD.md). The HUD displays saved character state and Requirement states; it must never grant a Ring, Grade, Focus stage, ability, HP recovery, or other progression by animation or timer completion.


### Location panel

- **Overview** — identity, purpose, description, ownership/access state, facility level, and current condition where relevant.
- **People** — NPCs present or associated with the location, including their current availability.
- **Activities** — gathering, work, production, services, construction, study, social interactions, and local events that are currently available.

Only show actions supported by the selected location, player state, schedule, resources, and unlock conditions.

---

## 3. World, scene, and location structure

Use a hierarchy that separates world geography from detailed scene presentation:

```text
WORLD
└── REGION
    └── AREA / SCENE
        ├── Terrain and environmental layers
        ├── Buildings and facilities
        │   └── Interactive locations / hotspots
        ├── NPCs and their current presence
        ├── Resource nodes and objects
        ├── Ambient elements
        └── Activities and local events
```

- A **region** groups areas and their route relationships.
- An **area/scene** is the isometric view currently presented.
- A **location/hotspot** is a selectable building, facility, person, resource node, or point of interest.
- A **scene transition** changes the active area after a valid travel action is resolved.

The scene is not an unrestricted movement field. Its artwork communicates spatial arrangement; tap targets provide interaction.

Buildings and facilities require defined footprints and interaction bounds. NPCs, resources, and ambient activity should be placed consistently with the scene layout. Visual positions and interaction targets must stay aligned.

---

## 4. Main gameplay loop

The normal Pocket loop is:

1. **Open Game.** Load the player's last valid area and locally saved state.
2. **Update local timeline.** Calculate elapsed time since the last valid checkpoint, then process due local timers safely.
3. **Render the area.** Display the isometric environment, available locations, current NPC presence, and visible activity.
4. **Inspect a point of interest.** Tap a facility, NPC, resource, object, or activity marker.
5. **Review the Location Panel.** Check Overview, People, and Activities.
6. **Choose an action.** Check the action's Requirements: time, tools, HP/Satiety, Stamina/Qi, materials, location access, and all other relevant state.
7. **Start or resolve the action.** Immediate actions resolve directly; timed actions create a saved job/process with a start time and expected completion condition.
8. **Refresh the simulation.** Update the scene, player state, inventory, materials, wallet, schedule, and event state when appropriate.
9. **Save locally.** Persist the result and any active timers.

```text
OPEN GAME
    ↓
LOAD LOCAL SAVE + RECONCILE ELAPSED TIME
    ↓
RENDER ISOMETRIC AREA
    ↓
TAP LOCATION / NPC / RESOURCE
    ↓
OPEN LOCATION PANEL
    ↓
CHOOSE AN AVAILABLE ACTION
    ↓
CHECK REQUIREMENTS, COSTS, NEEDS, TIME & ACCESS
    ↓
RESOLVE NOW OR START A TIMED PROCESS
    ↓
UPDATE SCENE + PLAYER STATE
    ↓
SAVE LOCALLY
```

The game should remain useful during brief visits. It must not demand constant tapping to keep a valid assigned process running, unless that activity's separately approved rules require active participation.

---

## 5. Activities and micro-economy

Pocket's economy is intended to begin small and grow through many compatible life paths. The examples below describe the intended breadth of the system, not a complete list of canon jobs or finalized numerical mechanics.

### Example starting condition

A new Pocket character might begin with:

- **Wallet:** 5 xc.
- **HP:** a recorded HP value.
- **Satiety:** a recorded Satiety value.
- A basic location and only the tools, items, and access actually granted by the selected starting setup.

The 5 xc example is a Pocket starting-balance proposal, not a change to Merzkava Universe canon. The actual starting profile, HP, Satiety, equipment, and starting location must be defined by the approved Pocket onboarding rules and must not be randomized on every reload.

### Gathering and resource work

| Activity direction | Example loop |
|---|---|
| **Foraging / meramu** | Search a suitable forest or wild area for fruit, herbs, edible plants, and other supported natural resources. |
| **Woodcutting** | Gather wood from valid resource locations using suitable tools and access. |
| **Hunting** | Track or hunt appropriate wildlife/Spirit Beasts only where the location, capability, danger, and applicable canon permit it. |
| **Farming** | Prepare land, plant crops, maintain them, and harvest after their defined growth period. Crop varieties and conditions can differ by region. |
| **Other collection work** | Gather water, minerals, fish, or other materials only where the scene and canon support their availability. |

Gathered resources may be sold, stored, processed, crafted, or reserved for construction when a valid recipe, buyer, facility, and rule exist. Do not make every resource universally sellable or usable everywhere.

### Facilities and production

Facility examples include:

- Well or water point.
- Wood-processing / sawmill facility, beginning at Level 1.
- Hunter's facility or hunting operation.
- Farms with multiple crop varieties and production cycles.
- Storage, workshops, markets, ports, and other location-appropriate facilities.

Facilities may have levels, capacity, unlock requirements, operating conditions, workers, and timed construction or upgrade processes. Those parameters must be defined per facility type before implementation. “Level 1” is an example of a progression tier, not a fully specified build cost or production rate.

### Work, learning, and life paths

Pocket should support multiple ways to participate in Merzkava's world, where the relevant institution, location, Requirements, and canon allow it. Examples include:

- Working as a market or port worker.
- Apprenticing under an Arcanist or learning a specialist craft.
- Pursuing the Spirit Realm path through an qualified teacher, institution, dojo, clan, or sect.
- Joining or studying at a dojo.
- Seeking instruction or service through a clan or sect.
- Working in logistics, trade, gathering, agriculture, workshops, or local services.

These are different paths with their own requirements and progression. Pocket must not grant an Arcanist grade, Spirit Realm progress, institutional membership, techniques, or formal recognition merely because a timer completed. Canon Requirements and examination/teaching rules continue to apply.

### Social links

Social development is a major activity category. Players may form and deepen relationships with NPCs through appropriate conversations, assistance, shared work, learning, gifts, or other approved interactions.

A Pocket **Social Link** feature is a game-layer representation. Its point scale, levels, thresholds, decay rules, rewards, and effect on canon relationships are not established by this concept document. They require a separate design decision. Do not present a new numerical affinity system as existing Merzkava canon.

### Micro-economy boundaries

The five Xuan denominations and their canonical exchange rates remain authoritative. Pocket still needs its own approved specification for:

- Prices and purchase/sale spreads for Pocket activities.
- Gathering yields and resource rarity.
- Wages, work contracts, and payment timing.
- Construction and upgrade costs.
- Recipes, material requirements, processing output, and facility upkeep.
- Crop types, growth durations, yields, and environmental requirements.
- Storage limits, spoilage, and resource loss if any.
- Social Link progression and any related rewards.

Do not invent these values during implementation. Keep the economy data-driven so values can be balanced without rewriting the scene engine or database schema.

---

## 6. HP, Satiety, and player needs

The player can have HP and Satiety as visible, persistent character-state values.

- Use the official Merzkava Universe HP and Hunger/Metabolism systems as the canon reference.
- Pocket must define how its real-time timer maps to the relevant canon time intervals; it must not create a second conflicting HP or Satiety formula.
- Do not reduce HP simply because a real-time timer elapsed unless an applicable canon rule or separately approved Pocket mechanic justifies the change.
- Food, rest, work intensity, injury, danger, and other state changes must have traceable causes.
- Do not allow offline or time-manipulation exploits to create unlimited recovery, food, or other needs-related benefits.
- The interface should make needs easy to read without turning every short visit into a punishment loop.

Canon references: `core/HP_SYSTEM.md` and `core/HUNGER_AND_METABOLISM.md`.

---

## 7. Real-time progression using the device clock

**Mandatory time rule:** all Pocket timers use the accelerated simulation clock and the separate UTC/Daily Login clock defined in [POCKET_SIMULATION_RULES.md](./POCKET_SIMULATION_RULES.md). Pocket simulation runs at ×48 (30 real minutes = 1 Pocket simulation day). Daily Login, relocation verification, and anti-cheat server checkpoints continue to use actual real-world time. Do not use the previous 1:1 simulation mapping.

Construction, assigned work, farming, production, recovery, and other approved time-based processes use **real-world elapsed time from the device's built-in clock**. Pocket is not intended to advance all progress only while the app is open.

### Expected behavior

1. When a timed process starts, save its process ID, start timestamp, required duration, relevant inputs, and completion rule.
2. Save a trusted-time checkpoint from the latest successful online synchronization.
3. While offline, continue the local simulation using the device's available time information and saved checkpoints.
4. When Pocket is opened again, calculate elapsed time and process due timers in a deterministic, idempotent way. The same timer must not pay out or complete twice.
5. When the internet becomes available, reconcile the local timeline and time-based outputs against the trusted server timeline.
6. If a time discrepancy is confirmed, correct the affected timeline and reverse progress or gains that came only from the invalid interval.

### Time records

Each time-dependent transaction should retain enough provenance to explain its result:

- Process/action ID and type.
- Start and completion timestamps.
- Last trusted server-time checkpoint.
- Device wall-clock observation.
- Monotonic elapsed-time observation where the platform provides it.
- Device boot/session boundary where available.
- Inputs consumed, outputs granted, currency paid, and progress applied.
- Reconciliation status: provisional, verified, corrected, or disputed.

Do not rely on one mutable timestamp field as the only proof of elapsed time. Keep an auditable event ledger so progress can be reconciled without blindly resetting unrelated player data.

---

## 8. Clock integrity, synchronization, and negative-balance reconciliation

Offline progress necessarily uses local device time, which the player can potentially alter. Therefore local time-based outputs must be reconcilable. **The game remains playable offline, but offline time-derived gains remain provisional until a trusted-time check runs when connectivity returns.**

### Trusted time and reconciliation

- The server's timestamp is authoritative for Daily Login claims and the trusted online time anchor.
- A successful online synchronization stores a signed server-trusted time checkpoint and the accepted local time-zone/area context.
- Offline actions can continue locally. Time-derived outputs that have not yet been checked by the server remain provisional in the ledger.
- On reconnection, compare the device's recorded timeline with the elapsed time that can be supported by trusted checkpoints and platform timing evidence.
- Detect unexpected forward jumps, backward jumps, rollback, inconsistent time-zone changes, duplicated completion claims, and impossible process durations.
- Correct only the time interval and outputs that are shown to be invalid. Do not erase legitimate progress earned during a verifiable interval.

### If a clock manipulation is confirmed

The reconciliation must account for what the player did with the unearned gains; spending or consuming them must not make the exploit permanent.

1. Calculate the excess progress, items, materials, wages, rewards, or production attributable to the invalid time interval.
2. Remove unspent invalid gains from the relevant inventory or balance.
3. Reverse downstream transactions where they can be cleanly reversed.
4. If invalid currency or materials were already spent, consumed, traded, or used in construction/upgrade, record the resulting deficit in the reconciliation ledger. The wallet may become negative when an invalid currency gain has already been spent.
5. If an invalid item/material was consumed, record the corresponding item/material deficit or reverse the dependent progress according to the approved rule. Do not invent a conversion price merely to turn every item into currency.
6. Roll back or recalculate time-derived facility/job progress that relied on the forged interval.
7. Apply the corrected trusted timeline and prevent the same invalid interval from being credited again.

**Example — illustrative only:**

- A player legitimately begins with 5 xc.
- The device clock is moved forward by one year while offline.
- The local game processes time-based work or production as though that year had genuinely passed.
- On reconnection, the server timeline shows that the year did not actually elapse.
- The excess wages and production are removed. If the unearned currency has already been spent, the currency balance is reduced by the corresponding amount and may become negative. If materials were consumed for an upgrade, the invalid material use or resulting progress is reconciled as a recorded deficit/rollback.
- The legitimate starting 5 xc and other progress from verified time remain intact.

This is an accounting correction, not an arbitrary punishment. Show the player a clear reconciliation record: detected interval, affected processes, removed gains, reversals, deficits, and corrected balance. Never silently alter the wallet.

### Security requirements

- Daily Login rewards must never be authorized solely by the device's editable clock.
- Reconciliation must be idempotent: syncing the same records again must not subtract the same gains twice.
- Use append-only or tamper-evident transaction records for grants, spending, consumption, construction, and reversals.
- Check process completion against the stored process definition and trusted elapsed interval.
- Keep the legitimate starting grant and verified transactions distinguishable from provisional offline gains.
- If evidence is insufficient, mark the affected interval for review or keep the uncertain gains provisional; do not fabricate a precise penalty.
- Avoid destructive full-save resets. Correct the smallest affected set of transactions and dependent state.

---

## 9. Daily Login, regional time, and relocation

Daily Login is the specific online-connected feature. It provides time-gated rewards and requires internet access to verify a claim. The rest of the available Pocket gameplay remains offline-capable.

### Daily Login rules

- The player must be online to verify and claim a Daily Login reward.
- The server checks the claim against authoritative time and the player's accepted regional time-zone context.
- The daily reset follows the accepted local time zone for the player's current area, not an arbitrary time zone selected solely to claim another reward.
- Each calendar day can be claimed only once under the accepted region's day boundary.
- Reward values, streak rules, missed-day handling, and the complete reward table require a separate approved Daily Login specification. This document does not invent them.

### Area and time-zone lock

Daily Login is tied to the region/time zone associated with the device's real area. The service must not let a player freely switch time zones to collect multiple daily rewards.

1. On the first successful Daily Login synchronization, record the accepted time-zone ID and the region/area evidence available to the service.
2. Keep that region/time-zone context locked for Daily Login.
3. If the device reports a different region or time zone, mark it as a **pending relocation**. Do not immediately move the daily reset boundary.
4. Accept the new area only after the device remains consistently in the new area for **24 continuous hours** and the relocation is confirmed during online synchronization.
5. After confirmation, migrate the Daily Login time-zone context to the new area and continue using that area's local day boundary.
6. A manual clock or time-zone setting change, VPN change, or isolated location signal must not by itself prove that the player physically relocated.
7. If the device's location/time-zone evidence is unavailable or contradictory, keep the existing lock and ask for a later online verification rather than granting an extra claim.

The exact Android signals and privacy-preserving relocation verification method must be defined during implementation. Prefer the minimum location/region information required; do not retain a continuous precise-location history just for Daily Login.

### Travel across time zones

A genuine move to another time zone—for example, travelling to another country—can be accepted after the 24-hour stable-relocation condition and a successful online check. The Daily Login clock then follows the new accepted region. This avoids both blocking legitimate relocation and allowing repeated manual time-zone hopping.

---

## 10. Local database and offline operation

Pocket needs its **own local database** for gameplay and simulation state. The database is separate from the isometric renderer and must persist while the app is closed or offline.

### Data groups

| Data group | Examples |
|---|---|
| World definitions | Regions, scenes, routes, terrain, location identifiers, and canon references. |
| Scene content | Artwork references, building footprints, layers, hotspots, NPC placements, and resource nodes. |
| Player state | Current scene, HP, Satiety, Stamina before Ring 1, Qi after Ring 1, injury, equipment, inventory, materials, assets, and five-denomination wallet. |
| Facilities | Ownership/access, level, capacity, condition, workers, construction, and upgrade processes. |
| Work and production | Assigned tasks, start/end timestamps, inputs, outputs, wages, energy reservations/consumption, interruption rules, and completion state. |
| Spirit Ring preparation and absorption | Ring sequence, target Beast/specimen, custody, required item, preparation checklist, readiness inputs, active duration, inter-Ring cooldown, energy-cost profile, reserved/spent/remaining energy, interruption state, and absorption outcome. |
| Farming and gathering | Crop/resource type, source location, growth/refresh timers, yield, and collection history. |
| NPC simulation | Profile references, current presence, schedules, social-link state, and recorded interactions. |
| Calendar and events | Local timeline, daily schedules, event triggers, active events, and resolved outcomes. |
| Travel | Origin, destination, route, transport, departure, arrival, and journey status. |
| Time integrity | Trusted server checkpoints, device-time observations, pending relocation, provisional gains, and reconciliation ledger. |
| Daily Login | Server claim reference, accepted time zone, claim history, and reward record. |
| Save metadata | Save identity, schema version, last update, migration and recovery information. |

### Offline requirements

- The player can load available scenes, inspect locations, perform unlocked activities, manage inventory, and continue valid timed processes without internet.
- Daily Login claim and authoritative time verification require internet.
- When offline, queue reconciliation records locally; do not pretend the server has verified them.
- When connectivity returns, synchronize time integrity and Daily Login claim Requirements without requiring the entire game to be online continuously.
- Keep world definitions separate from mutable player/session state.
- Use stable IDs for scenes, locations, NPCs, items, routes, facilities, processes, and events.
- Make related state changes transactional and safe against duplicate execution.
- Version the schema and provide safe migration/recovery for future builds.
- Keep imported Merzkava Universe canon data distinguishable from Pocket-specific rules and player-created state.

---

## 11. Engine and production requirements

This concept requires a **2D-capable game engine** for the isometric layer and a **local database** for simulation state. The current Android/WebView shell is not itself the game engine.

The engine layer is responsible for:

- Isometric rendering, camera presentation, and scene composition.
- Layer order, depth sorting, object footprints, and draw order.
- Building, terrain, environment, NPC, resource, and object artwork.
- Touch hit-testing for locations and entities.
- Scene transitions and lightweight travel presentation.
- Ambient, facility, NPC, environmental, and time-of-day animation.
- Efficient asset loading and memory use on lower-end Android devices.

The simulation/data layer is responsible for:

- Local time progression and timer evaluation.
- Activity requirements, resource production, jobs, facilities, and construction.
- NPC presence, schedules, and social interactions.
- Travel state and world events.
- Inventory, materials, assets, wallet, and transaction ledger.
- Offline persistence, Daily Login integration, and time reconciliation.

**Engine selection remains open.** Choose it after testing a representative isometric scene, touch interactions, asset pipeline, lightweight ambient animation, Android performance, offline persistence, and database integration. Do not select or install an engine based only on the presence of free-roam features in Merzkava APK.

---

## 12. Mandatory game authority and content catalogues

All runtime formulas and timer adaptations are governed by [Pocket Simulation Rules](./POCKET_SIMULATION_RULES.md).

Character progression and the character-status HUD are governed by [Pocket Progression and HUD](./POCKET_PROGRESSION_AND_HUD.md). This is the required reference for Awakening, sequential Ring gates, Spirit Realm/Stage, Arcanist Focus/Grade, HP/Satiety/Qi presentation, and progression Requirements.

Gameplay modes and their shared state requirements are governed by [Pocket Gameplay Modes and Catalogues](./POCKET_GAMEPLAY_MODES_AND_CATALOGS.md). This defines the requirements for Hunting, Part-time Job, Socialize, Sparring, War Zone, Cultivation/Spirit Ring, Arcanistry/Workshop, and Daily Life.

The content data schemas and approval gates are indexed in [Pocket Content Catalogues](./catalogs/README.md):
- [Spirit Beast Catalogue](./catalogs/SPIRIT_BEAST_CATALOG.md)
- [Skill and Technique Catalogue](./catalogs/SKILL_AND_TECHNIQUE_CATALOG.md)
- [Arcanistry Catalogue](./catalogs/ARCANISTRY_CATALOG.md)

These documents are jointly mandatory. The concept describes the product and presentation; it does not override the state, gates, formula, or provenance rules. The current Android/WebView pages are navigation scaffolding only; gameplay HUD, isometric runtime, database state, mode interactions, and catalog-backed progression are not implemented by the shell placeholders.

**Conflict rule:** the Pocket-specific documents govern Pocket adaptation and implementation. Merzkava Universe remains the authority for canon mechanics and facts. Do not change Universe source modules as a side effect of implementing Pocket.

## 13. Recommended implementation order

Build the data, time, and interaction contracts before producing a large amount of map artwork.

| Stage | Deliverable | Completion check |
|---|---|---|
| **01 — Simulation foundation** | Define Pocket's local database, stable IDs, event/transaction ledgers, dual-clock model, process scheduler, and offline save format. | A prototype can save, close, reopen, and resolve timers exactly once without losing valid state. |
| **02 — Character progression state machine** | Model Awakening, Mortal/Awakened states, nine Spirit Realms × four Stages, sequential Ring slots/gates, Sync/Qi, Arcanist Focus, Grade 1–10 and exam records. | Every transition has explicit prerequisites, source references, valid/blocked states and no timer-only promotion. |
| **03 — Canon and Pocket catalogues** | Build import/approval pipelines for Bestiary, abilities/techniques, Arcanistry, artifact/materials, jobs, facilities, items and NPC data. | Unknown data stays unknown; only verified or approved records can spawn, be learned, used or reward the player. |
| **04 — HUD and interaction contract** | Implement compact HP/Satiety/progression/Arcanist/Wallet strip, expanded Character drawer, Ring slots, Skillbook, Bestiary and Mode Hub navigation. | HUD values match recorded character state and every blocked action explains its unmet requirements. |
| **05 — Engine evaluation** | Evaluate the game engine with one low-cost isometric scene on the target Android device. | Scene rendering, touch targets, ambient animation, memory use, and responsiveness are acceptable. |
| **06 — Scene data contract** | Define area, location, footprint, hotspot, object, resource node, layer and NPC metadata. | One test area can be described without hard-coding its contents into the interface. |
| **07 — Isometric scene sample** | Render terrain, buildings, facilities, environment, and multiple interactive points. | Visual scale, depth order, footprints, and hit areas remain aligned. |
| **08 — Location interactions** | Implement Overview, People, Activities and contextual Mode Hub actions. | Tapping a supported object opens the correct information and only valid actions. |
| **09 — Core needs and first life loop** | Add HP/Satiety/injury, foraging, woodcutting, storage, and one approved resource loop. | Actions check the relevant Requirements, produce recorded outputs, and remain balanced. |
| **10 — Micro-economy and facilities** | Add selling, material use, one Level 1 facility sample, construction/upgrade timers and ledger-based transactions. | Every cost, yield and completion has an explicit data rule and is saved once. |
| **11 — Jobs, Arcanistry and Socialize** | Implement one data-backed job, one Focus/teacher assessment path, workshop sample, and evidence-based NPC interactions. | Job payment, Focus assessment, production, and relationship changes meet their own gates. |
| **12 — Hunting, Skillbook and Sparring** | Implement a source-backed Beast encounter, hunt stages, Ring custody/Requirements, sourced ability, and a controlled training example. | Hunt, combat, Ring absorption, technique learning and injury are not conflated. |
| **13 — War Zone and persistent events** | Integrate active World Events, faction/operation access, objectives, supply and persistent consequences. | War Zone appears only for valid active events and reconciles changes to the shared world state. |
| **14 — Daily Life, travel and World Events** | Connect schedules, NPC presence, farming/facilities, route Requirements, transport and conditional events to Pocket time. | Locations and world state evolve coherently without fabricated activities or unreachable destinations. |
| **15 — Daily Login, security and content hardening** | Add online claims, regional time-zone lock, trusted checkpoints, reconciliation, migration/recovery, and expanding content. | Clock changes cannot grant extra rewards or retain unearned gains; long offline sessions remain stable. |

### First production sample

Use one representative area as a technical and visual sample, not as a declaration that every depicted building or facility is already canon. It should prove:

- An attractive, readable isometric environment.
- Multiple selectable locations with distinct footprints and interaction bounds.
- A working Location Panel.
- One NPC with time-dependent presence.
- One gathering action with a saved result.
- One Level 1 facility or timed production example with explicitly configured values.
- One valid travel route and transition presentation.
- Local save/reload and a time-reconciliation test.

Only after this sample works should the same data and artwork workflow expand to other areas.

---

## 14. Explicit non-goals

Merzkava Pocket is not intended to be:

- A free-roam RPG with unrestricted character steering.
- A copy of Merzkava APK's movement model.
- A game that requires an always-on internet connection for ordinary gameplay.
- A static map with decorative buttons and no persistent simulation.
- A teleport-based scene selector that ignores route and travel state.
- A source of unapproved canon changes, arbitrary prices, or invented social progression.

**Product identity:** a lightweight, persistent, offline-first isometric life simulation in the Merzkava world, with real-time progression, a small evolving economy, meaningful places and relationships, and an online-verified Daily Login.
