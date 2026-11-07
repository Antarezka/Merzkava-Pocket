# Merzkava Pocket — Mandatory Simulation and Adapted Formula Rules

**Status: MANDATORY — binding Pocket gameplay specification**  
**Applies to:** Pocket game runtime, local simulation database, all time-based activities, character needs, progression, economy, NPC schedules, and Daily Login integration.  
**Authority boundary:** This document adapts Merzkava Universe mechanics for Pocket only. It does not amend, replace, or write back to the Merzkava Universe repository. Merzkava APK retains its own rules and free-roam gameplay.

> **Implementation gate:** No Pocket gameplay system may use an unadapted multi-day or multi-year Universe timer directly. No feature may create a competing formula for a mechanic covered here. Where a Pocket-specific number is still marked pending, the mechanic must remain data-disabled or qualitative until the value is approved.

---

## 1. Product and authority rules

Merzkava Pocket is a lightweight, offline-first **2D Isometric Location-Based Life Simulation**. It is not a free-roam RPG and must not inherit Merzkava APK's unrestricted character movement model.

Pocket inherits the setting, recognized institutions, character systems, item identity, currency, world geography, transport, and formula foundations from the pinned Merzkava Universe source. Pocket then applies the time and usability adaptations defined in this document.

When sources appear to disagree, use this order:

1. Merzkava Universe defines canon facts and the original formula.
2. This document defines the **Pocket-only adapted runtime value or formula**.
3. Approved Pocket content data supplies local values such as crop timers, building costs, yields, wages, or activity availability.
4. UI presentation must never change a formula or silently grant a result.

A Pocket adaptation is not a canon change. Do not commit Pocket timer values or economy balances into Merzkava Universe.

## 2. Two separate clocks — never merge them

Pocket requires two different time authorities because simulation pacing and Daily Login have different purposes.

### 2.1 Pocket Simulation Clock

The Pocket Simulation Clock is the accelerated in-game calendar used by:

- NPC schedules and daily routines.
- Activities and work shifts.
- Facility production and construction.
- Farming and resource cycles.
- Injury recovery and other time-based simulation rules.
- World events and simulated travel.
- Canon time requirements after their Pocket conversion.

**Mandatory conversion:**

```text
1 real-world second = 48 Pocket simulation seconds
1 real-world minute = 48 Pocket simulation minutes
1 real-world hour = 2 Pocket simulation days
30 real-world minutes = 1 Pocket simulation day
1 real-world day = 48 Pocket simulation days
```

The Universe fallback calendar has 30 days per month and 12 months per year. Under the Pocket ×48 scale:

| Universe duration | Pocket real-time equivalent |
|---|---:|
| 1 in-world hour | 75 real seconds |
| 3 in-world hours | 3 minutes 45 seconds |
| 12 in-world hours | 15 minutes |
| 24 in-world hours / 1 in-world day | 30 minutes |
| 7 in-world days | 3 hours 30 minutes |
| 30 in-world days / 1 in-world month | 15 hours |
| 360 in-world days / 1 in-world year | 7 days 12 hours |
| 1,440 in-world days / 4 in-world years | 30 days |

The simulation clock advances from elapsed UTC duration multiplied by 48. Local timezone affects the displayed local clock and local calendar labels, but changing a timezone never adds or removes elapsed simulation time.

### 2.2 Trusted Real-World Clock

The Trusted Real-World Clock uses absolute UTC time and is used for:

- Server time checkpoints.
- Daily Login eligibility and claim records.
- Clock manipulation detection.
- Device relocation verification.
- Audit timestamps and synchronization.

Daily Login is **not accelerated**. One Daily Login day is one genuine local calendar day under the player's accepted and server-verified timezone. The Pocket ×48 simulation clock must never be used to create extra Daily Login claims.

### 2.3 Timer calculation

For an ordinary Pocket process whose original duration is defined in Universe in-world time:

```text
Pocket Timer (real seconds) =
    Universe Duration (in-world seconds) / 48
```

Use full precision internally. Round only the displayed countdown. A process may complete only once, after its stored completion timestamp has been reached. Reopening the app must not duplicate output or restart its timer.

If a process is specified directly as a Pocket duration (for example, the special Ring 1 → Ring 2 onboarding interval below), use that approved Pocket duration rather than applying the ×48 conversion a second time.

---

## 3. Spirit Ring progression — mandatory Pocket cooldown adaptation

The Universe cooldown table remains the source for **relative progression order** and the original minimum intervals. Pocket replaces the impractical real waiting durations with a Pocket-specific schedule.

The first successful Ring absorption has no preceding cooldown. After a ring is successfully absorbed, the following interval controls the earliest next-ring eligibility. Ring availability, Martial Soul Awakening, Spirit Realm/Stage, Sync bottleneck, required items, body readiness, Beast source, and every other canon gate remain mandatory.

### 3.1 Pocket cooldown table

| Successful ring just absorbed | Next ring | Universe minimum interval | Mandatory Pocket wait |
|---:|---:|---:|---:|
| Ring 1 | Ring 2 | 2 weeks | **20 seconds** |
| Ring 2 | Ring 3 | 1 month | **15 hours** |
| Ring 3 | Ring 4 | 3 months | **1 day 21 hours** |
| Ring 4 | Ring 5 | 6 months | **3 days 18 hours** |
| Ring 5 | Ring 6 | 1 year | **7 days 12 hours** |
| Ring 6 | Ring 7 | 2 years | **15 days** |
| Ring 7 | Ring 8 | 3 years | **22 days 12 hours** |
| Ring 8 | Ring 9 | 4 years | **30 days** |
| Ring 9 | — | No next ring | **No cooldown; maximum reached** |

The schedule deliberately uses a **20-second first progression window** for an accessible early game and the ×48 conversion for later canon intervals. The final Ring 8 → Ring 9 wait is exactly 30 days, matching the Pocket long-progression ceiling.

### 3.2 Ring cooldown formula

For Ring 2 → Ring 9, convert the Universe interval using the general Pocket ×48 rule:

```text
Pocket Wait = Universe Minimum Interval / 48
```

Ring 1 → Ring 2 is the explicit onboarding exception:

```text
Pocket Wait (Ring 1 → Ring 2) = 20 seconds
```

Do not apply both the 20-second exception and the ×48 conversion. Do not compress the 30-day Ring 8 → Ring 9 Pocket wait further.

### 3.3 What the cooldown does and does not do

- The wait begins only after a successful absorption is committed to the local save.
- The cooldown timer continues while the app is closed.
- When it reaches zero, it only opens the **time gate**. It does not guarantee a ring, a hunt, a successful absorption, or a breakthrough.
- All non-time canon prerequisites remain in force, including Sync gap, ring availability, required item, actual Awakening, and body/compatibility conditions.
- Cultivation time may advance its own approved Sync process only under the canon rules; it must not be used to bypass any separate Pocket time gate unless a future Pocket rule explicitly changes that gate.
- Spirit Realm 9 and Ring 9 remain the maximum. No tenth ring or extra cooldown may be added.

The special first interval is a Pocket pacing adjustment, not a change to the Universe's two-week canon interval.

**Timer separation:** this table is the post-success inter-Ring cooldown only. It is not the duration of the active absorption procedure. Universe does not specify a per-Ring active absorption-process duration. Keep `inter_ring_cooldown` and `absorption_process_duration` as separate process/state fields; active absorption durations remain pending until specifically approved for Pocket.

---

## 4. Arcanist training and Artificial Artifact production timers

Use the mandatory active-practice hours and baseline workshop hours from `core/ARCANISTRY_AND_FORMULATION.md` §13.11. Convert those Universe in-world hours through the Pocket ×48 rule. The resulting timer is a minimum process duration, **not an automatic pass, Grade award, or guaranteed production success**.

### 4.1 Mental-focus training

| Stage | Universe guided-practice minimum | Pocket timer |
|---|---:|---:|
| Pemula | 12 hours | **15 minutes** |
| Initiate | 24 hours | **30 minutes** |
| Beginner | 40 hours | **50 minutes** |
| Ordinary | 60 hours | **1 hour 15 minutes** |
| Ahli | 90 hours | **1 hour 52 minutes 30 seconds** |
| Expert | 120 hours | **2 hours 30 minutes** |

Mandatory requirements remain:
- Foundational instruction from a qualified teacher or recognized educational source.
- Focus stages completed in order.
- Actual assessment by the teacher/institution.
- Registration, eligibility, and official examination for every Arcanist Grade.
- Personal-designed engraver and all other applicable requirements for higher Grades.

Elapsed Pocket timer alone never awards an assessed stage or official Arcanist Grade.

### 4.2 Artificial Artifact focused-work timer

| Target Artifact Tier | Universe workshop baseline | Pocket timer |
|---:|---:|---:|
| Tier 1 | 1 hour | **1 minute 15 seconds** |
| Tier 2 | 2 hours | **2 minutes 30 seconds** |
| Tier 3 | 3 hours | **3 minutes 45 seconds** |
| Tier 4 | 4 hours | **5 minutes** |
| Tier 5 | 6 hours | **7 minutes 30 seconds** |
| Tier 6 | 8 hours | **10 minutes** |
| Tier 7 | 12 hours | **15 minutes** |
| Tier 8 | 18 hours | **22 minutes 30 seconds** |
| Tier 9 | 24 hours | **30 minutes** |
| Tier 10 | 36 hours | **45 minutes** |

This table is only a Pocket timer conversion. The Arcanist Grade × target Tier production chance, authorized resolution procedure, suitable materials, focus, and all production gates remain as defined by Universe canon. The Artificial Artifact Condition Score applies only after a successful Artificial Artifact production; it is not a generic building/facility quality formula.

---

## 5. Character needs: HP, Satiety, and injury

### 5.1 HP

Use the exact maximum HP table in `core/HP_SYSTEM.md`. Mortal maximum remains **100 HP**. Spirit Realm and Stage determine higher maximum values.

- Do not invent passive HP regeneration.
- Do not refill HP merely because a process timer completes.
- HP changes require a valid cause, treatment, item, ability, or other documented effect.
- HP 0 retains its canon consequence. Do not soften or alter it through Pocket UI.

### 5.2 Satiety

Use the Universe Satiety formula and modifiers from `core/HUNGER_AND_METABOLISM.md`, but calculate biological need against **actual real-world elapsed awake time**, not the accelerated ×48 simulation clock. This is a deliberate Pocket pacing override so a normal player does not lose all Satiety every 30 minutes.

```text
Pocket base Satiety reduction =
    (Real awake hours / Canon base hours per 100 Satiety) × 100

Pocket final reduction =
    min(Current Satiety,
        Base reduction × A × F × B × S)
```

Keep the canon base-hours table by body/Spirit Realm, activity factors, missed-meal factors, body-condition factors, special modifiers, and ×8.00 combined cap. Do not multiply elapsed biological time by 48.

Meal windows follow the accepted local real-world clock for Pocket needs. Use the Universe meal recovery values unchanged: small snack +10, standard meal +34, large meal +50. A normal meal opportunity is evaluated once per real local day in each corresponding meal window. Do not run 48 accelerated meal-window cycles in one real day.

For background work/production timers, do not repeatedly classify the same elapsed interval as if the player had personally performed the task continuously. Apply an activity modifier only to actual player-character activity represented by the process and according to its approved Pocket rule. If no such rule exists, do not invent an extra Satiety charge for an unattended timer.

Protected normal sleep keeps the canon Satiety lock while the character is asleep. If Pocket cannot reliably establish sleep state, it must not silently label all app-closed time as sleep; use a clear in-game Rest/Sleep action and persist its start and end.

### 5.3 Injury recovery

Keep Universe injury classes, care requirements, stabilization gates, and percentage recovery rates. Convert the Universe's 24-hour recovery interval with the ×48 Pocket clock.

| Injury class | Universe rate | Pocket rate |
|---|---|---|
| I — Light | Natural +10% / 24h; treated +20% / 24h | Natural +10% / 30 real min; treated +20% / 30 real min |
| II — Requires care | Natural +2% / 24h; treated +10% / 24h | Natural +2% / 30 real min; treated +10% / 30 real min |
| III — Structural | No functional natural recovery; treated +5% / 24h after structural treatment | No functional natural recovery; treated +5% / 30 real min after structural treatment |
| IV — Critical | No recovery before stabilization; +2% / 24h after stabilization during continuing treatment | No recovery before stabilization; +2% / 30 real min after stabilization during continuing treatment |

Progress remains 0–100%. Structural injuries require the specified structural treatment; critical injuries require stabilization first. HP recovery and injury recovery remain separate.

### 5.4 Spirit Realm and Sync progression

Spirit Realm, Stage, Sync compatibility, bottleneck, Spirit Ring requirements, and breakthrough outcomes retain the Universe's mechanics and hard gates. Any canon duration attached to a genuinely timed activity uses the Pocket ×48 conversion unless this document gives a more specific Pocket exception.

Do not award Spirit Realm, Stage, Sync, Arcanist Grade, a technique, or a ring only because time elapsed. The action, teacher, examination, process, ring, item, eligibility, and resolution requirements remain in force.

---

## 6. Jobs, facilities, farming, and resource production

Pocket must support small ongoing activities and longer production processes. Their **existence and content** may be inspired by canon locations, livelihoods, materials, and institutions; their numerical outputs are not automatically defined by Universe lore.

### 6.1 Timer rule

When a Pocket content record contains an approved Universe-equivalent duration:

```text
Pocket Process Duration = Canon In-World Duration / 48
```

If a Pocket activity is intentionally designed with a native duration, store that duration explicitly as a Pocket value and do not convert it again.

Examples:
- A canon-equivalent 3-hour work shift becomes 3 minutes 45 seconds.
- A canon-equivalent 7-day crop growth period becomes 3 hours 30 minutes.
- A canon-equivalent 30-day facility build becomes 15 real hours.
- A canon-equivalent 1-year project becomes 7 days 12 hours.

These are timer conversions only. They do not establish that a specific job, crop, facility, or construction project exists or has those canonical durations.

### 6.2 Foraging and gathering

Foraging may cover fruit, edible plants, herbs, and other resources supported by the current region/scene. Universe provides geography, habitats, resource context, item pricing, and inventory accounting; it does not provide one universal yield-per-click or respawn formula.

Before implementing numerical gathering, Pocket content must specify:
- Resource node identity and permitted region/season.
- Required tool/access and eligibility.
- Yield range or fixed yield and the resolution method.
- Resource depletion/refresh timer.
- Inventory capacity or storage destination.
- Item condition/freshness and applicable local market base price.

Do not invent a universal foraging yield or respawn duration. Until approved data exists, show discovery/availability qualitatively and do not mint inventory.

### 6.3 Woodcutting and timber

Use only established tree/wood resources appropriate to the location. Woodcutting requires a supported tool and a valid resource source. The Pocket content record must provide yield, depletion, refresh/regrowth, tool condition/durability if applicable, and material identity.

Wood can be sold, stored, processed, or reserved for construction only through a valid transaction or recipe. Do not create a generic wood sale price or construction recipe without the matching Pocket data.

### 6.4 Farming

Farming must be data-driven per crop and region. Each approved crop record must include:
- Crop identity and valid growing regions/seasons.
- Seed/input requirement and planting access.
- Water/soil/environment requirements where relevant.
- Pocket growth duration and stage milestones.
- Harvest yield and quality/condition outcome.
- Replanting, depletion, spoilage, and storage behavior where applicable.

The timer uses the approved Pocket duration or the ×48 conversion of an approved canon duration. The conversion formula does not invent a crop calendar, growth rate, or harvest quantity.

### 6.5 Facilities and construction

Well, sawmill, hunter facility, farm, workshop, storage, market, and other facility types must each have an approved data definition. At minimum define:
- Stable facility ID and location/footprint.
- Level and upgrade path.
- Construction/upgrade timer.
- Material and currency costs.
- Capacity, worker slots, and operating requirements.
- Production rate/output and upkeep, if any.
- Damage, maintenance, or operating restrictions where applicable.

A facility's timer is converted by ×48 only when its source duration is specified in Universe-equivalent time. Costs and yields require approved Pocket content data. Never use Artificial Artifact condition scoring to rate ordinary buildings.

### 6.6 Employment and life paths

Work at a port, market, farm, workshop, institution, dojo, clan, sect, or Arcanist environment requires a real location, available role, access, and eligibility. Pocket job data must define shift duration, wages, requirements, interruption behavior, and payment timing.

An Arcanist apprentice or Spirit Realm student must follow the appropriate Universe progression and examination gates. A completed work timer may record attendance or completed practice hours; it does not automatically confer professional rank, Arcanist Grade, Spirit Realm, Stage, technique, membership, or recognition.

---

## 7. Economy: inherited formulas and Pocket data

### 7.1 Inherited unchanged

Use the five Xuan denominations and official exchange rates from `core/10_ECONOMY_SYSTEM.md`:

- 100 xc = 1 xs.
- 100 xs = 1 xg.
- 1,000 xg = 1 zj.
- 10 zj = 1 az.

Use the Universe nine item-quality tiers, condition multipliers, scarcity multipliers, demand multipliers, and one unified item pricing formula:

```text
Final Price =
  (Tier 1 Base Price × Tier Multiplier × Condition Multiplier
   × Scarcity Multiplier × Demand Multiplier)
  + Distribution Adjustment + Local Market Adjustment
```

The formula is inherited unchanged. Item base prices must still be grounded in the relevant local market; a Tier 1 item does not have one universal global price.

### 7.2 Pocket-specific transaction design

Universe does not define one universal buyback percentage for every resource, nor does it define Pocket's starting grant, all job wages, construction prices, crop values, or production yields.

Pocket must create approved local data tables for these values. Every value must have a source, effective version, and applicable region/location. Do not create a flat “sell everything for 50%” rule.

### 7.3 Opening balance and ledgers

The example **5 xc** starting balance is a Pocket opening-balance proposal/test fixture, not a canon-wide Wallet assignment. It must be granted once during the approved onboarding flow and stored as an opening balance, not as invented past income.

Inherit the Universe accounting rules:
- Append-only money transaction ledger, with before/after Wallet.
- Append-only item movement ledger, with quantity/state before and after.
- Cross-reference money and item entries for purchases/sales.
- Preserve original entries and add correction entries rather than silently rewriting history.
- Reconcile Inventory, Equipment, Assets, and Wallet with the latest verified ledger.

Negative Wallet balance is permitted only as an explicit Pocket anti-cheat reconciliation deficit for spent, proven-unearned offline gains. It is not an automatic loan and earns no invented interest.

---

## 8. NPC relationships, schedules, and World Events

### 8.1 Social relationships

Use `world/NPC_MANAGEMENT.md` as the relationship source:
- Relationship changes require a witnessed event or another recorded basis.
- Preserve cause and direction.
- NPC disposition may be pro, contra, neutral, or mixed.
- One NPC's disposition does not prove reciprocal feelings.
- Keep location, continuity, knowledge, and persistent consequences aligned.

Pocket may display a Social Link timeline or qualitative status from this record. Numeric affection points, level thresholds, decay, rewards, or romance meters are **not Universe formulas**. They require a separately approved Pocket mechanic and must not be fabricated by the runtime.

### 8.2 Schedules and daily routines

Use an established NPC schedule when the relevant regional/canonical record supplies one. Otherwise, NPC routines are Pocket content data and must be explicitly authored. Under Pocket's ×48 simulation clock, a 24-hour in-world routine completes in 30 real minutes. This accelerated schedule is independent of Daily Login's 24-hour real-day boundary.

### 8.3 World Events

Use `world/DYNAMIC_EVENTS.md` for the definition and lifecycle of persistent world-level events. Ordinary activities such as one meal, one foraging session, a normal shift, or one private conversation remain local simulation records unless they create a persistent world-level consequence.

Do not fabricate events to fill idle time. Run events only when their trigger, scope, time condition, and prerequisites are satisfied.

---

## 9. Daily Login, real-world time, and relocation security

Daily Login is the one intentionally online-gated daily feature. Ordinary gameplay remains offline-capable.

Mandatory rules:

1. Daily Login claims require successful online server validation.
2. The server's UTC timestamp is authoritative for claim eligibility.
3. The accepted regional timezone determines the local calendar-day boundary.
4. The timezone cannot be freely changed to claim another reward.
5. A different area/timezone is a pending relocation until the new area remains consistent for **24 continuous real-world hours** and the server validates it.
6. Only after validation does Daily Login adopt the new area's timezone.
7. Manual clock settings, manual timezone changes, or a VPN alone are not proof of genuine relocation.
8. One local calendar day can produce at most one claim under the accepted timezone.
9. Reward amounts, streak progression, and missed-day policy require a separate approved Daily Login table. Do not invent them.

---

## 10. Device clock integrity and reconciliation

Local device time is required to keep the game running offline, but it is not trusted as the sole proof of elapsed time.

### 10.1 Time evidence

Record:
- Server-validated UTC checkpoint.
- Device wall-clock observation.
- Monotonic elapsed-time observation where Android provides it.
- Boot/session boundary where available.
- Accepted timezone and pending relocation state.
- Each process start, completion, input, output, and transaction.
- Whether each time-derived output is provisional, verified, corrected, or disputed.

A timezone offset change must not alter UTC elapsed duration. A device reboot or loss of monotonic continuity must be treated as an evidence boundary, not silently trusted as proof of a long interval.

### 10.2 Reconciliation sequence

1. On a successful online connection, obtain and persist a server-validated UTC checkpoint.
2. Offline, allow the local Pocket simulation to continue using available device timing evidence. Mark unverified time-derived outputs as provisional.
3. On reconnection, compare elapsed UTC supported by the server with locally recorded device/monotonic evidence.
4. Identify the specific intervals and processes that depended on any confirmed forged forward jump or rollback.
5. Remove unspent provisional currency, items, materials, and production outputs attributable to invalid time.
6. If invalid currency was already spent, append a correction debit for the proven spent amount. The Wallet may become negative.
7. If invalid items/materials were consumed, processed, traded, or built into assets, trace the item ledger and reverse dependent results or record a matching material deficit.
8. Convert a material deficit into currency only when the official item-pricing formula and a defensible local base price support the conversion. Otherwise preserve a material deficit; never invent a price to force a currency debit.
9. Roll back or recalculate process completion that relied on the invalid interval.
10. Mark every correction with references to the original provisional grants and related spending. Reconciliation must be idempotent; the same invalid gain is never debited twice.
11. Preserve all progress supported by valid elapsed time and legitimate transactions. Never wipe the entire save for one invalid interval.

### 10.3 Negative balance example

A player legitimately starts with 5 xc, advances the device clock by a year, completes offline work, and spends the unearned wages. On reconnect, the server confirms that the claimed year did not elapse. The invalid wage grant is reversed. Because the player already spent it, the correction ledger records the spent unearned amount as a deficit and the Wallet may become negative. The original legitimate 5 xc and all progress supported by valid time remain intact.

This is an accounting correction, not an arbitrary punishment. Show the corrected balance and detailed ledger references to the player. Do not silently deduct currency or apply Universe's roleplay anti-cheat character-death sanctions to Pocket.

---

## 11. Formula inheritance and adaptation matrix

| System | Universe source | Pocket treatment |
|---|---|---|
| Xuan denominations and exchange rates | `core/10_ECONOMY_SYSTEM.md` | Inherit unchanged |
| Item pricing formula and quality/market multipliers | `core/10_ECONOMY_SYSTEM.md` | Inherit unchanged; use local evidence/data |
| Money and item ledgers | `core/10_ECONOMY_SYSTEM.md` | Inherit structure; append-only local implementation |
| HP maximum and HP state | `core/HP_SYSTEM.md` | Inherit unchanged |
| Satiety formula/modifiers/food recovery | `core/HUNGER_AND_METABOLISM.md` | Inherit numeric formula; use actual real awake time and Pocket meal windows |
| Injury class and recovery progress | `core/INJURY_SYSTEM.md` | Inherit rates; compress recovery time by ×48 |
| Spirit Ring cooldown | `bestiary/SPIRIT_BEAST_RULES.md`, `gameplay/TIME_AND_ACTION_RULES.md` | Pocket override table; first wait 20s, final wait 30d |
| Spirit Realm/Sync/absorption gates | `core/CULTIVATION_SYSTEM.md`, `core/SPIRIT_RING_RULES.md` | Inherit mechanics and eligibility; only approved time gates are adapted |
| Arcanist focus training | `core/ARCANISTRY_AND_FORMULATION.md` §13.11 | Convert hours by ×48; retain teacher assessment |
| Artificial Artifact work time | `core/ARCANISTRY_AND_FORMULATION.md` §13.11 | Convert hours by ×48; retain Grade and production gates |
| Artifact condition score | `core/ARCANISTRY_AND_FORMULATION.md` §14 | Inherit only for successfully made Artificial Artifacts |
| Jobs, gathering, farming, facilities | Relevant Universe setting modules | No universal canon formula; require approved Pocket content data; convert specified canonical durations by ×48 |
| Social Link numeric points | `world/NPC_MANAGEMENT.md` | No numeric canon formula; qualitative record inherited, numeric extension requires approval |
| NPC schedules and World Events | `world/NPC_MANAGEMENT.md`, `world/DYNAMIC_EVENTS.md` | Inherit records/lifecycle; schedules authored from canonical context and Pocket content |
| Daily Login | No equivalent universal claim formula in audited Universe modules | Pocket-only online server validation; actual 24h regional day |
| Device clock anti-cheat | `templates/ANTI_CHEAT_HARD_GATE.md` is RP enforcement, not Pocket code | Pocket-specific server checkpoint and ledger reconciliation; do not copy RP death sanctions |

---

## 12. Pocket-only values still requiring owner-approved data

The following must be authored as Pocket content/configuration before those features can mint resources, currency, or permanent progression:

- Starting-state and 5 xc onboarding grant.
- Foraging and gathering yields, node depletion, and refresh times.
- Woodcutting yields, resource regrowth, tool requirements, and processing losses.
- Crop catalogue, seed costs, water/soil requirements, Pocket growth timers, and harvest yields.
- Well, sawmill, hunter facility, farm, storage, market, and workshop build costs, materials, levels, capacities, production, upkeep, and upgrades.
- General work roles, job qualification, shift length, wages, payment timing, and promotion.
- Social Link numeric progression, thresholds, decay, and rewards.
- Daily Login reward values, streak rules, and missed-day policy.
- Clock anomaly tolerances, evidence confidence rules, and disputed-reconciliation handling.

Pending values must not be replaced with random constants in code. Keep them unavailable or clearly marked pending until an approved data record exists.

---

## 13. Implementation requirements and verification gates

### Required runtime components

- **Clock service:** separate accelerated Pocket simulation time from trusted UTC and accepted local timezone.
- **Process scheduler:** stores process definitions, starts, deadlines, inputs, outputs, state, and completion IDs.
- **Simulation engine:** evaluates due activities/events deterministically and idempotently.
- **Needs service:** applies HP/Satiety/injury rules with the correct time basis.
- **Economy service:** computes market prices only from approved inputs and maintains transaction/item ledgers.
- **Progression service:** applies Ring cooldown and learning/training gates without automatic rank grants.
- **Daily Login client:** online-only server-validated claim and relocation lock.
- **Reconciliation service:** reviews provisional gains and appends corrections without destructive save resets.

### Required tests before release

1. Verify 30 real minutes advances exactly one Pocket simulation day.
2. Verify one real day advances 48 simulation days, but only one Daily Login local day can be claimed.
3. Verify timezone change does not change UTC elapsed time or accelerate process completion.
4. Verify Ring 1 → Ring 2 wait is exactly 20 seconds.
5. Verify Ring 8 → Ring 9 wait is exactly 30 days.
6. Verify Ring 9 has no next-ring cooldown or tenth-ring action.
7. Verify each Arcanist training and artifact timer matches §4.
8. Verify Satiety uses real awake time, not the ×48 simulation multiplier.
9. Verify injury progress uses the Pocket-compressed timer and retains class-specific gates.
10. Verify one process cannot complete or grant outputs twice after app restart, repeated sync, or duplicate callbacks.
11. Verify invalid offline gains are reversed once, including gains already spent or consumed.
12. Verify legitimate starting balances and valid progress survive reconciliation.
13. Verify unknown prices, yields, wages, construction costs, and Social Link values cannot be silently fabricated.
14. Verify low-end Android performance and local save recovery on the target device.

**Binding principle:** Pocket may accelerate waiting, but it must not skip eligibility, invent rewards, double-count transactions, or change the canon source of a mechanic.


---

## 14. Mandatory progression, HUD, mode, and catalogue dependencies

This document is the time/formula authority. It does **not** replace the detailed character progression gates or content catalogues. The following companion specifications are mandatory and must be implemented together with this file:

- [POCKET_PROGRESSION_AND_HUD.md](./POCKET_PROGRESSION_AND_HUD.md) — authoritative Pocket state/HUD contract for Awakening, Ring 1 vs Ring 2–9 prerequisites, Spirit Realm/Stage, Sync/bottleneck, Arcanist Focus, Grade 1–10 examination gates, HP, Satiety, Qi, and skills display.
- [POCKET_GAMEPLAY_MODES_AND_CATALOGS.md](./POCKET_GAMEPLAY_MODES_AND_CATALOGS.md) — Hunting, Part-time Job, Socialize, Sparring, War Zone, Cultivation/Ring, Arcanistry/Workshop, Daily Life, and cross-mode continuity.
- [catalogs/README.md](./catalogs/README.md) — required content catalogue index.
- [catalogs/SPIRIT_BEAST_CATALOG.md](./catalogs/SPIRIT_BEAST_CATALOG.md) — Beast species/specimen, habitat, age, appraisal, ring-source and required-item data.
- [catalogs/SKILL_AND_TECHNIQUE_CATALOG.md](./catalogs/SKILL_AND_TECHNIQUE_CATALOG.md) — Martial Soul abilities, Spirit Abilities, formal techniques, combat proficiency, artifact functions and life skills.
- [catalogs/ARCANISTRY_CATALOG.md](./catalogs/ARCANISTRY_CATALOG.md) — Focus, Grade, examinations, Formation Engravers, materials, formulations and artifact records.

### 14.1 Sequential Ring gate is not a timer-only unlock

The cooldown table in §3 controls only the Pocket waiting-time gate. It is **not** the whole Ring eligibility rule.

- Ring 1 requires completed and verified Martial Soul Awakening, a legitimately available/obtained physical Ring, and all applicable body/compatibility/absorption conditions. It has no previous-Ring, Realm bottleneck, or inter-Ring cooldown requirement.
- Ring 2–9 are strictly sequential. Every preceding Ring must have been successfully absorbed and recorded. A visible empty slot or a completed cooldown does not allow a player to skip a Ring.
- Ring 2–9 additionally require the correct Realm/Stage progression, Sync gap below 10 percentage points, `0 Day left`, a legitimate target Ring, the target Beast's mandatory item, suitable body condition/compatibility, and every other official gate.
- If a gate fails, the absorption success chance is 0%. A timer reaching zero cannot start or complete the absorption by itself.
- Ring 9 / Spirit Realm 9 is the maximum. There is no Ring 10.

### 14.2 Arcanist Focus and Grade are different state fields

- Focus has six teacher-assessed stages in order: Pemula, Initiate, Beginner, Ordinary, Ahli, Expert. Pocket practice timers are in §4; they do not automatically pass an assessment.
- Passing Initiate makes the student eligible for the Apprentice Examination. It does not award Grade 1.
- Official Arcanist Grade 1–10 is awarded only after registration, meeting the target Grade's prerequisites, sitting the recognized examination, and passing.
- Grade 2–10 conditions, cohort caps, competitive ranking, personal-designed Formation Engraver and candidate-made artifact prerequisites remain in the progression/HUD specification and the Universe source.
- Arcanist Grade and Focus must be shown separately in the HUD. Neither is inferred from Spirit Realm, Martial Soul rarity, time elapsed, or artifact ownership.

### 14.3 Catalogues and game modes cannot fabricate content

- Universe contains category/rule modules for Spirit Beasts but not a populated species catalogue in the audited source pin; Pocket must not create fake canonical species to fill the Bestiary.
- Universe does not define a universal generic list of hundreds of abilities automatically unlocked per Spirit Realm. Each ability requires documented Martial Soul/Ring/Beast/formulation or teacher/technique/artifact provenance.
- A War Zone exists only when a corresponding active World Event and valid regional/operational access exist.
- Wages, Pocket Social Link numbers, crop yields, resource respawns, facility outputs, and Daily Login rewards require approved Pocket data when not defined by Universe.

**No module may bypass these dependencies by using a placeholder result, generic Realm unlock, timer-only promotion, invented species, or unverified catalogue record.**
