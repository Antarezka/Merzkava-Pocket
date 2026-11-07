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
5. **Real-time progression.** Construction, assigned work, production, recovery, and other approved timed processes use elapsed real-world time measured from the device, subject to time-integrity validation.
6. **Offline-first gameplay.** The main game loop, local scenes, saved state, and already available activities do not require a continuous internet connection.
7. **Online Daily Login.** Daily Login rewards require an internet connection so the service can verify the claim day, time zone, and eligibility.
8. **Canon remains authoritative.** Merzkava Universe supplies established lore, geography, transport, currency, character systems, and organizations. Pocket-specific micro-economy and simulation rules must be defined separately without silently changing canon.

---

## 2. Game screen and visual layout

The following wireframe is a layout reference, not a final visual asset. “Tianhai Campus” is an example label only; it does not establish a new canon location.

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
│                 ◆                  │
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
6. **Choose an action.** Validate requirements, time, tools, HP/Satiety, materials, access, and other relevant state.
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
VALIDATE COSTS, NEEDS, TIME & ACCESS
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

Pocket should support multiple ways to participate in Merzkava's world, where the relevant institution, location, eligibility, and canon allow it. Examples include:

- Working as a market or port worker.
- Apprenticing under an Arcanist or learning a specialist craft.
- Pursuing the Spirit Realm path through an eligible teacher, institution, dojo, clan, or sect.
- Joining or studying at a dojo.
- Seeking instruction or service through a clan or sect.
- Working in logistics, trade, gathering, agriculture, workshops, or local services.

These are different paths with their own requirements and progression. Pocket must not grant an Arcanist grade, Spirit Realm progress, institutional membership, techniques, or formal recognition merely because a timer completed. Canon eligibility and examination/teaching rules continue to apply.

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

**Pocket time mapping:** use one verified real-world second as one Pocket simulation second (1:1). A verified 24-hour real interval therefore advances 24 hours of Pocket simulation time. This is a Pocket execution rule, not a new Universe canon formula. Use absolute UTC elapsed time for process duration; accepted local time-zone data controls local-time presentation and Daily Login day boundaries only. A time-zone change must never accelerate a timer.

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

Offline progress necessarily uses local device time, which the player can potentially alter. Therefore local time-based outputs must be reconcilable. **The game remains playable offline, but offline time-derived gains are subject to validation when connectivity returns.**

### Trusted time and reconciliation

- The server's timestamp is authoritative for Daily Login claims and the trusted online time anchor.
- A successful online synchronization stores a signed/validated time checkpoint and the accepted local time-zone/area context.
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
- Validate process completion against the stored process definition and verified elapsed interval.
- Keep the legitimate starting grant and verified transactions distinguishable from provisional offline gains.
- If evidence is insufficient, mark the affected interval for review or keep the uncertain gains provisional; do not fabricate a precise penalty.
- Avoid destructive full-save resets. Correct the smallest affected set of transactions and dependent state.

---

## 9. Daily Login, regional time, and relocation

Daily Login is the specific online-connected feature. It provides time-gated rewards and requires internet access to verify a claim. The rest of the available Pocket gameplay remains offline-capable.

### Daily Login rules

- The player must be online to verify and claim a Daily Login reward.
- The server validates the claim against authoritative time and the player's accepted regional time-zone context.
- The daily reset follows the accepted local time zone for the player's current area, not an arbitrary time zone selected solely to claim another reward.
- Each calendar day can be claimed only once under the accepted region's day boundary.
- Reward values, streak rules, missed-day handling, and the complete reward table require a separate approved Daily Login specification. This document does not invent them.

### Area and time-zone lock

Daily Login is tied to the region/time zone associated with the device's real area. The service must not let a player freely switch time zones to collect multiple daily rewards.

1. On the first successful Daily Login synchronization, record the accepted time-zone ID and the region/area evidence available to the service.
2. Keep that region/time-zone context locked for Daily Login.
3. If the device reports a different region or time zone, mark it as a **pending relocation**. Do not immediately move the daily reset boundary.
4. Accept the new area only after the device remains consistently in the new area for **24 continuous hours** and the relocation is validated during online synchronization.
5. After validation, migrate the Daily Login time-zone context to the new area and continue using that area's local day boundary.
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
| Player state | Current scene, HP, Satiety, equipment, inventory, materials, assets, and five-denomination wallet. |
| Facilities | Ownership/access, level, capacity, condition, workers, construction, and upgrade processes. |
| Work and production | Assigned tasks, start/end timestamps, inputs, outputs, wages, and completion state. |
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
- When connectivity returns, synchronize time integrity and Daily Login eligibility without requiring the entire game to be online continuously.
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

## 12. Canon formulas and Pocket adaptation

**Rule of authority:** use the existing Merzkava Universe formula whenever a matching canon formula exists. Pocket adapts its presentation, persistence, and real-time execution; it does not create a competing version of the same mechanic. The canonical module remains the source of truth. Store formula inputs and outputs in Pocket data with a source-module reference and formula version so a later canon update can be reconciled.

The audit below uses the Merzkava Universe sources pinned by its README at `268df00`. The relevant formula-bearing files in that pin were checked against the current `main` tree and have matching file contents.

### 12.1 Currency, item pricing, and transaction accounting

Use the five official Xuan denominations and fixed exchange rates:

| Conversion | Canon rate |
|---|---:|
| Xuan Copper → Xuan Silver | 100 xc = 1 xs |
| Xuan Silver → Xuan Gold | 100 xs = 1 xg |
| Xuan Gold → Zun Jade | 1,000 xg = 1 zj |
| Zun Jade → Ancient Zun | 10 zj = 1 az |

Do not change these exchange rates. Pocket's opening example of **5 xc** is a proposed Pocket starting balance, not a universal Merzkava character balance. Keep it as the initial test scenario until the Pocket onboarding table is approved; never recalculate it on reload.

For ordinary item valuation, inherit the single Merzkava Universe formula:

```text
Final Price =
  (Tier 1 Base Price
   × Tier Multiplier
   × Condition Multiplier
   × Scarcity Multiplier
   × Demand Multiplier)
  + Distribution Adjustment
  + Local Market Adjustment
```

Use the tier, condition, scarcity, demand, distribution, and local-market values from `core/10_ECONOMY_SYSTEM.md`. Do not maintain separate Pocket multipliers or apply the same market pressure twice. Base price is specific to the item's identity and local source market. The Snow Herb example at 5 xc is only an illustration for that northern market; it is not a universal price for fruit, wood, herbs, crops, or all Tier 1 items.

**Important market boundary:** the canon pricing formula values ordinary items, but it does not define a universal merchant buyback percentage or a fixed sale spread for every resource. A Pocket sale must use a valid local buyer/market quote calculated from supported inputs. Do not invent “sell for 50%” or another blanket percentage.

The following Merzkava Universe accounting rules carry directly into Pocket:

- Every Wallet income and expense gets its own chronological, append-only transaction-ledger entry.
- Each currency entry records date/time, source/recipient, reason, direction, amount, conversion where relevant, balance before, balance after, and cause.
- Every item quantity/ownership/condition/location change gets an item-ledger entry.
- Purchases and sales cross-reference their money and item entries.
- Opening Wallet and inventory are opening balances, not invented past transactions.
- Corrections preserve the original ledger entry and append a correction; never silently rewrite history.
- Building/property records belong in Assets, separately from carried Inventory.

Use the canon ledger structures in `core/10_ECONOMY_SYSTEM.md` as the data contract for Pocket's local database.

### 12.2 HP and injury

HP maximum and current HP follow `core/HP_SYSTEM.md`:

- Mortal maximum HP is **100**.
- Spirit Realm and Stage determine higher maximum HP using the official table; Pocket must read that table rather than inventing its own scaling curve.
- HP is stored as current/maximum. A change in maximum does not automatically refill current HP.
- HP reaching 0 means death under the current canon.
- The canon does **not** define a general numeric HP regeneration rate. Do not create passive HP regeneration merely because a real-time timer ran; recovery needs a documented item, treatment, technique, or separately approved Pocket rule.

Injury is a separate state from HP. If Pocket represents injury recovery, inherit `core/INJURY_SYSTEM.md`:

| Injury class | Natural recovery at full rest per 24 in-world hours | With appropriate treatment |
|---|---:|---:|
| I — Light | +10 progress | +20 progress |
| II — Requires care | +2 progress | +10 progress |
| III — Structural | No functional recovery from rest alone | +5 after required structural treatment |
| IV — Critical | No progress before stabilization | +2 after stabilization during continuing treatment |

Progress is capped at 100%. Apply only when the real recovery conditions are actually met. Treatment must match the injury and be available and correctly applied. HP recovery and injury recovery remain separate.

### 12.3 Satiety and activity intensity

`core/HUNGER_AND_METABOLISM.md` is the **single authority** for Satiety. Pocket must implement this formula rather than an independent hunger timer.

```text
Base Satiety reduction =
  (Awake elapsed hours / Base hours per 100 Satiety) × 100

Final Satiety reduction =
  min(Current Satiety,
      Base reduction × A × F × B × S)
```

The canonical baseline duration for 100 Satiety is:

| Body / cultivation status | Awake time per 100 Satiety |
|---|---:|
| Mortal | 24 hours |
| Spirit Initiate | 2 days |
| Spirit Adept | 4 days |
| Spirit Elder | 8 days |
| Spirit Monarch | 16 days |
| Spirit King | 32 days |
| Spirit Ancestor | 64 days |
| Spirit Emperor | 128 days |
| Spirit Sovereign | 256 days |
| Spirit Primordial | 365 days |

Use the canonical modifiers:

| Input | Canon values |
|---|---|
| Activity factor A | Awake rest ×0.50; Light ×1.25; Moderate ×1.75; Heavy ×2.50; Survival ×4.00 |
| Missed-meal factor F | 0 missed ×1.00; 1 ×1.75; 2 ×2.75; 3 or more ×4.00 |
| Body-condition factor B | Normal/light fatigue ×1.00; noticeable fatigue ×1.25; heavy fatigue ×1.75; extreme fatigue ×2.50 |
| Special biological factor S | Use only a documented numeric effect; otherwise ×1.00 |
| Combined modifier cap | Maximum ×8.00 |

Canonical meal recovery:
- Small snack: **+10 Satiety**.
- Standard meal: **+34 Satiety**.
- Large meal: **+50 Satiety**.
- Normal meal windows: 06:00–11:00, 12:00–18:00, and 19:00–01:00 local world time.
- Protected normal night sleep locks Satiety at the value when sleep begins. Sleep does not restore Satiety.

Do not assign one fixed Satiety factor just from an activity's name. Assess the actual interval: a short easy gathering task may be Light, sustained physical gathering may be Moderate, and strenuous woodcutting may be Heavy when the described effort supports it. Do not count the same elapsed interval twice. Keep full internal precision and round only the displayed value to one decimal place, as required by canon.

### 12.4 Time, action duration, and Pocket's real-time adapter

Use `gameplay/TIME_AND_ACTION_RULES.md` for the world calendar and action rules:

- If no other session calendar exists, use the canon fallback of 12 months × 30 days, with the established season and weekday cycles.
- Ordinary player actions are limited to **3 in-world hours per turn**.
- Normal night sleep is the protected exception and may exceed 3 hours.
- Pure cultivation may use the canon allowance of up to one month only when every required safety, logistics, checkpoint, and activity condition is satisfied.
- Time passing alone does not grant cultivation progress, Spirit Ring absorption, a breakthrough, or another progression result.

**Pocket real-time adaptation:** for the first Pocket implementation, use a **1:1 elapsed-time mapping**: one verified real-world second advances one Pocket simulation second; 24 verified real-world hours advance 24 Pocket simulation hours. This is a Pocket execution rule, not a new Merzkava Universe canon rule. Any future time multiplier requires an explicit Pocket balance revision.

Measure elapsed duration using an absolute UTC timeline. The accepted local time zone is used for local-time presentation and Daily Login day boundaries; changing a time-zone offset must not add, remove, or accelerate elapsed process time. Use the accepted in-world calendar rules for the displayed simulation date.

The Universe three-hour ordinary-action limit governs discrete gameplay actions/turns. It does not mean a background Pocket timer must stop after three hours. Timed Pocket processes can continue while the app is closed, but their activity-specific durations and eligibility must be defined by the applicable canon or approved Pocket data.

### 12.5 Arcanist training and Artificial Artifact production

Pocket must directly reuse the binding training and workshop schedule in `core/ARCANISTRY_AND_FORMULATION.md` §13.11 where the player is undertaking the Arcanist path.

**Mental-focus training stages**

| Stage | Minimum guided practice | Standard schedule (up to 3 hours/day) | Mortal baseline Satiety cost |
|---|---:|---:|---:|
| Pemula | 12 active hours | 4 training days | 87.5 |
| Initiate | 24 active hours | 8 training days | 175.0 |
| Beginner | 40 active hours | 14 training days | 291.7 |
| Ordinary | 60 active hours | 20 training days | 437.5 |
| Ahli | 90 active hours | 30 training days | 656.3 |
| Expert | 120 active hours | 40 training days | 875.0 |

These are minimum guided-practice hours, not automatic stage grants. A qualified teacher/institution must assess the student's demonstrated progress. Foundational theory, travel, exam waiting, and recovery breaks are not included unless separately established.

**Artificial Artifact focused-work baseline**

| Target Artificial Artifact Tier | Workshop time | Mortal baseline Satiety cost |
|---:|---:|---:|
| Tier 1 | 1 hour | 7.3 |
| Tier 2 | 2 hours | 14.6 |
| Tier 3 | 3 hours | 21.9 |
| Tier 4 | 4 hours | 29.2 |
| Tier 5 | 6 hours | 43.8 |
| Tier 6 | 8 hours | 58.3 |
| Tier 7 | 12 hours | 87.5 |
| Tier 8 | 18 hours | 131.3 |
| Tier 9 | 24 hours | 175.0 |
| Tier 10 | 36 hours | 262.5 |

These Satiety reference totals assume a Mortal, normal body condition, no missed meal windows, no special modifiers, and Moderate work intensity. Recalculate actual intervals using the official Satiety formula for other statuses and conditions.

Do not award Arcanist Focus stages, Arcanist Grades, or examination passes merely because a timer finishes. Mandatory instruction, teacher assessment, eligibility, official examinations, tool authorship, and other relevant gates remain in force.

The Arcanist Grade × target Artificial Artifact Tier success matrix in §5 and the Artificial Artifact Condition Score in §14 are separate mechanics. The condition formula applies **only to a successfully produced Artificial Artifact**. Do not apply it to a well, sawmill, ordinary building, farm, or other non-artifact facility. Production failure resolution and numeric situational modifiers remain unresolved where the core module says they are unresolved; Pocket must not invent them.

### 12.6 Spirit Realm, learning, and institutional paths

When Pocket offers Spirit Realm study or cultivation, use `core/CULTIVATION_SYSTEM.md`, `core/SPIRIT_RING_RULES.md`, `core/SPIRIT_REALM_TRADITIONS.md`, and the applicable school/dojo/clan/sect sources.

- Spirit Realm and Arcanist progression are independent.
- Learning access requires a real qualified teacher or recognized institution where canon requires one.
- Training attendance or elapsed time alone does not automatically grant a Spirit Realm, Stage, Sync progress, Spirit Ring, technique, or breakthrough.
- Spirit Ring eligibility, cooldown/Day left, compatibility, absorption, and breakthrough follow their existing formulas and hard gates only.
- Do not turn an ordinary Pocket idle timer into cultivation progress or a free advancement system.

### 12.7 NPC relationships and Social Link

The Universe relationship model in `world/NPC_MANAGEMENT.md` is evidence-based and qualitative:

- Record the relationship's cause: witnessed event, family tie, employment, debt, rivalry, agreement, or another confirmed basis.
- Record the NPC's own disposition when useful: pro, contra, neutral, or mixed.
- A recorded stance is directional; it does not prove that both parties feel the same way.
- Change a relationship only after a scene or confirmed event justifies it.
- Preserve continuity, location, knowledge, and cause for important persistent changes.

The proposed Pocket **Social Link** screen may visualize this existing relationship record, its history, and available interactions. A numeric affection/relationship-point scale, thresholds, decay, rewards, romance meter, or automatic relationship level is **not** present in the audited Universe canon and must not be invented as if it were. It needs a separate owner-approved Pocket rule before numerical implementation.

### 12.8 World Events and daily schedules

Use `world/DYNAMIC_EVENTS.md` for persistent world-level events. Its lifecycle and record schema (PROPOSED, ACTIVE, RESOLVED, SUPERSEDED, REJECTED; trigger, outcome, location/scope, evidence, involved actors, persistent effects, knowledge distribution, duration, and continuity notes) provide the reference for Pocket's event records.

Not every ordinary activity is a World Event. Meals, routine foraging, one private purchase, a normal work shift, or an individual NPC conversation remain local/player activity records unless they create a meaningful persistent effect on a region, route, resource, institution, faction, or wider world.

NPC schedules and local daily routines may be stored as Pocket simulation data, but the audited Universe modules do not define one universal schedule for every NPC. Use a relevant regional/NPC source where a schedule exists; otherwise a schedule is a Pocket-specific content record that needs approval.

### 12.9 Formulas and values not established by the audited Universe canon

The following systems have examples or setting foundations, but no universal numeric gameplay formula in the audited Universe modules:

| Pocket feature | What is missing and must be specified |
|---|---|
| Foraging / gathering | Yield per attempt, resource-node availability, refresh/respawn timing, tool modifiers, and success resolution. |
| Woodcutting | Wood yield, tree/resource depletion, regrowth, tool durability, and processing loss. |
| Farming | Crop catalogue, planting requirements, growth duration, water/soil/season effects, harvest yield, spoilage, and replant cycle. |
| Facilities | Well/sawmill/hunter/farm level requirements, build time, material list, construction costs, capacity, output rate, upkeep, and upgrades. |
| General employment | Job availability, qualifications, work duration, wage rates, shift rules, and promotion. |
| Merchant selling | Universal buyback spread or sale multiplier; local quotes still need supported market inputs. |
| Social Link | Numeric points, levels, thresholds, decay, and mechanical rewards. |
| Daily Login | Reward table, streak rules, missed-day policy, and claim progression. |
| Device-time security | Exact anomaly tolerance, evidence weighting, server protocol, relocation signals, and dispute handling. |

Do not fill these gaps with arbitrary values or borrow an unrelated formula (for example, do not use the Artificial Artifact condition formula as a building-construction formula). Keep these features disabled, qualitative, or clearly marked as pending until the corresponding Pocket rules and data tables are approved.

### 12.10 Anti-cheat and ledger boundary

Reuse the Universe's evidence, continuity, append-only ledger, validation, and correction principles. However, `templates/ANTI_CHEAT_HARD_GATE.md` is a roleplay enforcement procedure; its NPC social penalty and second-violation permanent-character-death rule are **not** Pocket device-clock penalties and must not be imported into Pocket.

Pocket's device-clock reconciliation is its own technical rule:

1. The server provides the trusted UTC checkpoint whenever the device is online.
2. Offline timers may run locally, but time-derived outputs remain provisional until reconciliation.
3. On reconnect, compare the local elapsed timeline with the server's actual elapsed time since the last trusted checkpoint. Use monotonic elapsed-time and boot/session evidence as supporting signals, not as a substitute for server time.
4. If a forged forward jump is confirmed, calculate the invalid interval and identify all gains produced by it: wages, completed work, harvests, resource yields, facility output, rewards, and other timer-derived changes.
5. Remove unspent invalid currency and unspent invalid items/materials.
6. If provisional currency was already spent, post a correction debit for the spent unearned amount. The net Wallet may become negative; this is a Pocket reconciliation deficit, not an automatically created in-world loan and not subject to invented interest.
7. If invalid items/materials were consumed, processed, sold, or built into something, trace the item ledger and reverse the invalid output or record the corresponding deficit. Convert a resource deficit into currency only when its value can be defensibly calculated with the official item-pricing formula and a known local base price; otherwise keep it as a material deficit rather than inventing a price.
8. Append correction entries with references to the original provisional grants and spending. Reconciliation must be idempotent: the same invalid gain cannot be debited twice.
9. Preserve legitimate opening balances and progress supported by trusted elapsed time. Do not wipe the entire save to correct one invalid interval.

For a time-zone change, keep elapsed duration on the UTC timeline. A candidate new area/time zone remains pending until the device has shown a consistent new area for **24 continuous hours** and the server validates the relocation. The exact Android evidence and privacy-preserving method remain an implementation requirement; a manual time-zone setting alone is not proof of physical relocation. A relocation must never create an extra Daily Login claim across the old and new day boundaries.

### 12.11 Canon source map used for this adaptation

- `core/10_ECONOMY_SYSTEM.md` — currency, item-quality tiers, regional pricing, unified pricing formula, money ledger, and item-movement ledger.
- `core/HP_SYSTEM.md` — HP maximum, current HP validation, and no general passive HP recovery rate.
- `core/HUNGER_AND_METABOLISM.md` — Satiety, meal windows, activity multipliers, missed meals, sleep, and body-condition modifiers.
- `core/INJURY_SYSTEM.md` — injury classes and recovery progress rates.
- `core/ARCANISTRY_AND_FORMULATION.md` — Arcanist progression, Grade success matrix, training schedule, production time, Satiety costs, and Artificial Artifact condition score.
- `core/CULTIVATION_SYSTEM.md` and `core/SPIRIT_RING_RULES.md` — Spirit Realm progression, Sync, eligibility, cooldown, absorption, and breakthrough rules.
- `gameplay/TIME_AND_ACTION_RULES.md` — calendar, action duration, sleep, and cultivation time-skip boundaries.
- `world/NPC_MANAGEMENT.md` — relationship continuity and qualitative NPC disposition.
- `world/DYNAMIC_EVENTS.md` — persistent event threshold, lifecycle, and event schema.
- `world/GEOGRAPHY_AND_TRAVEL.md` and `world/LOCATION_AND_ROUTE_NETWORK.md` — transport and route foundations.
- `world/GOLDEN_DRAGON_EMPIRE_POPULATION_SERVICES.md` and `world/TIANHAI_ACADEMIES_AND_ARCANIST_INSTITUTE.md` — institutional access and administration, not universal wage or fee tables.

## 13. Recommended implementation order

Build the data, time, and interaction contracts before producing a large amount of map artwork.

| Stage | Deliverable | Completion check |
|---|---|---|
| **01 — Simulation foundation** | Define Pocket's local database, stable IDs, transaction ledger, local-time model, and offline save format. | A small prototype can save, close, reopen, and calculate elapsed time without duplicating a transaction. |
| **02 — Engine validation** | Evaluate the game engine with one low-cost isometric scene on the target Android device. | Scene rendering, touch targets, ambient animation, memory use, and responsiveness are acceptable. |
| **03 — Scene data contract** | Define area, location, footprint, hotspot, object, resource node, layer, and NPC metadata. | One test area can be described without hard-coding its contents into the interface. |
| **04 — Isometric scene sample** | Render terrain, buildings, facilities, environment, and multiple interactive points. | Visual scale, depth order, footprints, and hit areas remain aligned. |
| **05 — Location interactions** | Implement Overview, People, Activities, and contextual action validation. | Tapping a supported object opens the correct information and actions. |
| **06 — Basic needs and gathering** | Add HP/Satiety presentation, foraging, woodcutting, storage, and a small initial resource loop. | Actions validate needs/tools, produce recorded outputs, and remain balanced. |
| **07 — Micro-economy and facilities** | Add selling, material use, Level 1 facility sample, construction/upgrade timers, and ledger-based transactions. | Every cost, yield, and completion has an explicit data rule and is saved once. |
| **08 — Work, learning, and social paths** | Add an initial sample of work, institutional learning, and social interactions. | Eligibility follows canon and no new progression formula is silently assumed. |
| **09 — Daily Life and World Events** | Connect schedules, NPC presence, recurring activities, and conditional events to local time. | The same area changes appropriately over time without fabricating events. |
| **10 — Travel and scene transitions** | Add route validation, walking/horseback and other available transport, and travel state. | The player reaches only connected destinations and interrupted trips resume safely. |
| **11 — Daily Login and time security** | Add online claims, regional time-zone lock, 24-hour relocation validation, trusted checkpoints, and reconciliation. | Clock changes cannot authorize extra daily rewards or retain unearned time-based gains. |
| **12 — Content expansion and hardening** | Expand scenes/facilities, tune animation and performance, test migration and recovery. | Multiple areas and long-running offline sessions remain stable on target devices. |

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
