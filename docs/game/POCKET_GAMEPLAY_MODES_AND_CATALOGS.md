# Merzkava Pocket — Mandatory Gameplay Modes and Content Catalogue Architecture

**Status: MANDATORY — game-mode and catalogue architecture**  
**Depends on:** `POCKET_SIMULATION_RULES.md` and `POCKET_PROGRESSION_AND_HUD.md`.

Pocket is a location-based life simulation with multiple modes that share one character state, one world map, and one transaction/event ledger. Modes are not separate disconnected mini-games. Their **Requirements**, time, HP, Satiety, Stamina/Qi, inventory, money, NPC continuity, and progression all resolve through the same simulation services. Player-facing screens use Requirement / Requirements language, not conversation-style validation terminology.

---

## 1. Mode hub and shared interaction rules

The player should be able to open a **Mode Hub** from the isometric gameplay screen. It offers the modes the character can access at the current location, not a collection of always-unlocked buttons.

Each mode card must show:
- Mode title and a clear visual identity.
- Available / locked / unavailable-here / event-not-active / **Requirements missing** / **Requirements not configured** state.
- Current local location or valid destination.
- The requirements that block access.
- Active process/contract, remaining Pocket time, and claimable result when one exists.

Modes may appear as contextual actions in the Location Panel (Overview / People / Activities) and in the global Mode Hub. A mode cannot teleport the player or ignore travel access. Selecting an unavailable mode may explain how to unlock or reach it, but it must not fabricate a target, contract, NPC, or event.

All modes share:
- The same player HP, Satiety, Qi/stamina, injury, equipment, Inventory, Wallet, and assets.
- The same simulation clock and offline process scheduler.
- The same location/route and NPC availability state.
- The same source-of-truth, time-integrity and anti-cheat checks.
- The same append-only money, item, activity, progression, and event ledgers.

---

## 2. Hunting Mode

**Purpose:** wildlife gathering and Spirit Beast field hunting, from small local hunts to organized Ring expeditions.

### 2.1 Hunt types

1. **Ordinary hunting / resource hunt** — local wildlife or harvestable fauna where a region's content data explicitly supports it. It may produce food/materials only where valid loot data exists.
2. **Spirit Beast hunt** — a high-risk field activity using the actual Beast catalogue, region/habitat data, combat system, HP/injury, and an explicit claim/ownership resolution.
3. **Spirit Ring expedition** — the full progression path for a character who has already awakened their Martial Soul and is eligible to pursue a ring.

### 2.2 The three canon routes for Spirit Beast hunting

| Route | Pocket presentation | Required checks |
|---|---|---|
| Academy-supervised Safe Route | Expedition board, instructor, preparation, team roster, target area, return/withdrawal point | Actual academy access, instructor/leader, student readiness, area information, and planned safety procedure |
| Temporary Spirit Hunters Guild party | Guild board, contract/party listing, roster, terms, roles, route, spoils agreement | Local Guild office availability, contract Requirements, party terms, target information, evidence/ownership agreement |
| Solo hunt | Local map tracking/scouting action, supplies, target, escape route | Character capability, preparation, equipment, reliable information, terrain, and actual target danger |

A Safe Route reduces avoidable exposure; it is not a guarantee of safety, target presence, victory, or rescue. A Guild party does not guarantee trust or success. Solo hunting is not made feasible by selecting the Solo button.

### 2.3 Separate hunt stages

The interface must treat these as separate resolved stages:

```text
Find / Receive target information
    ↓
Scout / Prepare / Choose route
    ↓
Track / Encounter
    ↓
Combat / Retreat / Capture / Fail
    ↓
Resolve remains, loot, and ring appearance if supported
    ↓
Establish legitimate ring ownership/distribution
    ↓
Open Ring Preparation: check Awakening / Realm / previous Ring, Sync, cooldown, target Ring custody, required item, body condition, Satiety, energy reserve, and absorption method Requirements
    ↓
Sync / absorption process
    ↓
Successful Ring record OR failed absorption with valid consequences
```

Defeating a Beast is not the same as owning its ring. A ring appearing over a defeated Beast does not mean it was absorbed. The last hitter does not automatically own all rewards if a legitimate prior agreement says otherwise.

### 2.4 Hunt HUD

During a hunt show:
- Current location and route/area.
- Target identity and confidence state (confirmed, reported, tracks only, unknown).
- Known Beast category, specimen age, Age Grade, tier/appraisal state, capabilities and uncertainty.
- Party members, roles, condition, injuries and agreed loot/ring terms.
- HP, Satiety, Qi/stamina and relevant equipment.
- Combat log, tactical choices, retreat status, objective and extracted rewards.
- If a Ring is involved: Ring number sought, prior Ring count, active absorption duration, inter-Ring cooldown, Sync gap/cap, target item, body condition, Satiety, Stamina/Qi reserve, preparation method, and every Requirement state.

Do not reveal hidden Beast capabilities, rare loot, exact age, hidden identity, or a Ring ability before a valid discovery/appraisal event establishes it.

### 2.5 Ring Preparation and Energy panel

Before the player can start a Spirit Ring absorption, open a dedicated Preparation panel. It must show four independent sections:

**Progression Requirements**
- Correct next Ring number and no skipped previous Ring.
- Awakening complete for Ring 1.
- Correct Realm/Stage and Sync bottleneck for Ring 2–9.
- Inter-Ring cooldown exactly zero for Ring 2–9.
- Ring 9 maximum restriction.

**Target Requirements**
- Correct target Beast/specimen and actual Ring availability.
- Legitimate custody/ownership and party spoils agreement.
- Target-specific required item for Ring 2–9.
- Beast age, aggression evidence, appraisal state and uncertain fields.

**Character Preparation**
- HP, injury and functional restrictions.
- Satiety and fatigue/body condition.
- Martial Soul condition and resonance evidence.
- Chosen absorption method, instruction/support, location and actual equipment.
- Official readiness inputs G, P, F, V required by the Universe formula.

**Energy Requirement**
- Ring 1: Stamina reserve; Qi is not yet formed.
- Ring 2–9: current Qi reserve.
- Show configured total cost, minimum start reserve, reserved amount, and expenditure schedule.
- If the Ring's Pocket energy-cost profile is not approved/configured, show **Requirement not configured: absorption energy cost** and keep Start Absorption disabled.

Do not confuse the Universe recipient-readiness score P with energy amount. P is a 0–100 formula input; Stamina/Qi expenditure is a separate Pocket resource cost. The official Universe formula remains the authority for cap, success chance, defect risk and AWR. The active duration and inter-Ring cooldown are two separate timers.

### 2.6 Hunt resolution constraints

- Use Universe combat rules for attack/defense/damage/combo and existing PowerScale/Qi rules.
- Do not reuse Spirit Ring absorption probability as the chance to find or defeat a Beast.
- Do not invent a universal encounter percentage, tier multiplier, or guaranteed reward.
- HP 0 retains the permanent-death rule unless a future explicit owner-approved Pocket rule changes it.
- Injury and recovery use the class, treatment and Pocket-time rules.
- A hunt timer or scout result can reveal a clue; it cannot guarantee the target or victory.

---

## 3. Part-time Job and Contract Mode

**Purpose:** give the player a dependable everyday income path, workplace identity, work schedule, and interaction with the local economy.

### 3.1 Job board

Each location's job board may show currently active vacancies such as:
- Market assistant, stall helper, porter, clerk, delivery, warehouse worker.
- Port, dock, shipyard, cargo, fishing or maritime support.
- Farm hand, orchard/garden worker, animal care, harvest assistant.
- Workshop helper, materials sorter, assistant engraver, repair support.
- Academy, dojo, clan, sect, guild, medicine hall or institute support positions where the actual employer offers them.
- Local services, construction, cleaning, kitchen, courier, and other regionally grounded occupations.

These are examples of Pocket job categories, not claims that every listed vacancy exists in every region. Job records are authored per employer, location, role, and availability.

### 3.2 Job data and Requirements

Every vacancy requires:
- Employer ID, workplace/location, role ID and vacancy count.
- Required age or legal/education restrictions where established.
- Required skills, references, credentials, equipment or affiliation.
- Shift duration in Pocket time, break policy, attendance check, completion condition.
- Wage, payment currency, tax/fees if applicable, payment time, and ledger reference.
- Safety conditions, work intensity, injury/interrupt rules, and dismissal/contract completion terms.
- Whether the job is repeatable, seasonal, limited, or event-specific.

No vacancy may be invented from a district name alone. No universal hourly wage, salary, sell price or job level exists in the audited Universe modules. Those are Pocket economy data and must be explicitly authored and approved.

### 3.3 Job flow

```text
Discover vacancy → Inspect employer and requirements
→ Apply / interview / trial if configured
→ Employer acceptance
→ Sign/accept job terms
→ Start shift → Work / interrupt / complete
→ Evidence of completion → Wage transaction → Work record
```

- Applying is not guaranteed acceptance.
- Completing a timer is not proof if attendance or deliverables were required and not recorded.
- A wage is paid once, after valid completion and reconciliation.
- Job time uses the Pocket time adapter. Satiety is charged only for actual represented work using the applicable Pocket activity category.
- Arcanist apprenticeships, academy education, guild membership, and professional certification remain distinct from ordinary employment.

### 3.4 Job HUD

Show role/employer, workplace, shift start/end, completion %, actual tasks, expected wage, requirements, attendance, HP/Satiety, relevant tools and work conditions. Do not show expected pay as money already owned.

---

## 4. Socialize Mode

**Purpose:** conversations, relationships, favors, shared routines and social discovery with individual NPCs.

### 4.1 Core interactions

- Talk / greet / ask about local matters.
- Learn about NPC work, schedule, interests, affiliations, and known information.
- Request help, a lesson, employment, introduction, trade, escort or team invitation.
- Offer help or complete an agreed favor.
- Share a meal, attend an event, work together or practice together when supported by the location and NPC availability.
- Review remembered events, agreements, debts, rivalries, trust and unresolved conversations.

### 4.2 Social state

The Universe uses an evidence-based relationship model. Preserve:
- NPC identity and profile reference.
- Relationship cause (family, witnessed event, work, debt, agreement, conflict, gift, rescue, etc.).
- Directional stance (pro, contra, neutral, mixed) and the exact NPC/character side it describes.
- NPC disposition and motive; the player does not automatically know it.
- Last meaningful interaction, knowledge, location, and continuity.
- Any genuine obligation, debt, promise, rivalry, alliance or boundary.

**No canon numeric affection scale exists.** Pocket may later add visible Social Link points/levels as a game-only presentation, but it must not replace the qualitative relationship record or imply that a numeric score automatically controls love, loyalty, employment or rewards. Until such a Pocket formula is approved, display qualitative relationship notes and evidence-based milestones only.

### 4.3 Social HUD

Show NPC name, current availability/location, conversation topics, known vs unknown facts, relationship history, active agreements/favors, and any next interaction requirement. Do not reveal private motives or hidden relationship information before discovery.

---

## 5. Sparring and Training Mode

**Purpose:** practice Martial Soul control, learned combat techniques, timing, defense, tactics, and coordination in a training context.

### 5.1 Access and format

Sparring must take place at a supported dojo, academy training ground, clan facility, guild practice area, or other valid training location—or through a specifically arranged encounter. The opponent must be an actual available NPC or player/party participant.

Sparring formats may include:
- Technical drill / form practice.
- One-on-one spar.
- Partner drill.
- Group coordination.
- Instructor demonstration and assessment.
- Supervised practical class.

These are Pocket mode options, not automatic guarantees of a sparring partner, instructor, or venue.

### 5.2 Combat and safety

- Resolve contact and attacks through the Universe combat rules unless a separately approved Pocket sparring rule explicitly defines a controlled non-lethal format.
- Sparring does not automatically prevent damage or injury. Protective equipment, agreed restrictions, instructor intervention and medical support must actually be present and effective.
- Record HP changes and injury effects through the official modules.
- Do not turn a practice session into real war or lethal hunting without the encounter actually changing.
- Training attendance alone does not grant a formal technique, Spirit Realm, Stage, Spirit Ring, Sync progress, Arcanist Focus, or Arcanist Grade.
- A teacher may assess a learned technique or Focus stage only when they have the relevant expertise and the actual assessment requirement is satisfied.

### 5.3 Sparring HUD

Show sparring rules/consent, opponent, instructor, drill objective, active skills, equipment, HP/Satiety/Qi or stamina, injury warnings, score/result if a Pocket scoring rule is defined, and training record. Do not invent score-to-rank conversion or automatic mastery.

---

## 6. War Zone Mode

**Purpose:** location-based participation in an active conflict, battlefield operation, siege, military emergency or other persistent hostile World Event.

War Zone is **not an always-open arena** and must not be added to peaceful locations as a permanent generic button. It becomes available only when the selected world location and current world state contain an active conflict or a valid operation that the character can reach.

### 6.1 Entry requirements

Before showing an active War Zone operation, verify:
- A current World Event or canon conflict exists and has status ACTIVE.
- The event scope includes the current region/location or a valid connected destination.
- The factions/forces and objective are established by canon or event records.
- The player's side, affiliation, contract, reason for entry, or credible access is known.
- Route, supply, transport, allies, local authority and withdrawal conditions are grounded.
- Character Requirements and actual danger are checked. A player is not automatically a soldier or combatant because the mode exists.

### 6.2 Operation types

Depending on the actual event, Pocket may present:
- Reconnaissance / scouting.
- Courier and supply movement.
- Escort / evacuation.
- Defensive watch / checkpoint.
- Rescue / medical transport.
- Patrol / tracking.
- Field skirmish or frontline combat.
- Objective support / engineering / logistics.
- Siege, defense or control-point tasks only where the event defines them.

### 6.3 War Zone rules

- Use `world/DYNAMIC_EVENTS.md`, regional/faction records, travel/ambush rules and the official combat system.
- The event's objectives, duration, actors, knowledge, casualties, and consequences are shared persistent world state—not isolated match results.
- Do not respawn a dead character through the mode menu.
- Do not invent a generic PvP queue, battle rating, capture reward, faction reputation bonus, war loot table, or victory multiplier.
- A war event may change NPC schedules, job availability, prices, routes, safety, medical access and regional control only through a recorded event effect.
- If no active war event exists in the region, show **No active War Zone operation here** rather than creating a battle.

### 6.4 War Zone HUD

Show operation/event name and status, faction/side/contract, current objective, location and route, friendly/hostile actors whose identity is known, supplies, injury/medical state, HP/Satiety/Qi, extraction or retreat conditions, and active event consequences. Distinguish confirmed intelligence from rumor.

---

## 7. Cultivation and Spirit Ring Mode

This mode is the player's dedicated progression workflow, not an automatic level-up screen.

### Sections

- Awakening services and records.
- Martial Soul details and confirmed traits.
- Spirit Realm/Stage and Sync cultivation.
- Ring slot overview and next Ring requirements.
- Beast hunt route selection.
- Ring target research / bestiary.
- Required item preparation.
- Absorption Requirements and result.
- PowerScale, Qi and acquired Spirit Ability record.

Every step must call the progression requirements in `POCKET_PROGRESSION_AND_HUD.md`. The UI must present exact blockers before enabling an attempt; it must never hide missing gates behind an unexplained disabled button.

---

## 8. Arcanistry and Workshop Mode

This is a separate learning and professional path.

### Sections

- Find a legitimate Arcanistry teacher/institution.
- Foundation lessons and Arcanist Focus practice.
- Teacher assessment and Focus progression.
- Apprentice and Grade 1–10 examination registration.
- Formation Engraver / Engraver's Apprentice acquisition and blueprint design.
- Materials and provenance inventory.
- Formulation and pattern library.
- Workshop production and process logs.
- Artificial Artifact collection, series codes, condition, ownership and qualifying Grade counts.
- Tianhai Arcanist Institute research and recognition records where accessible.

All prerequisites and formulas must resolve using the canonical Arcanistry source. Do not use a fake skill tree to bypass teacher assessment, exams, artifact requirements, or ownership checks.

---

## 9. Bestiary, Field Notes and Skillbook

These are persistent knowledge libraries attached to the character profile, not automatically unlocked world encyclopedias.

### 9.1 Bestiary

The Bestiary collects:
- Known species and category.
- Confirmed habitat/region and last discovered location.
- Specimen age and Age Grade, where actually established.
- Appraisal Tier and whether it is official, provisional, or unknown.
- Known capabilities, behavior, weaknesses and danger evidence.
- Spirit Ring properties and target-specific mandatory item, if discovered/verified.
- Discovery evidence: rumor, tracks, sighted, identified, appraised, defeated, Ring obtained.

The player-facing Bestiary must maintain two distinct knowledge states:
1. **World record:** the complete factual record available to game simulation.
2. **Character knowledge:** only what the character has legitimately discovered, learned, purchased, been taught, or appraised.

Do not show undiscovered species entries or hidden stats just because data exists in the app. A discovered clue is not a completed identification or appraisal. Catalogue completeness must not create omniscience.

### 9.2 Skillbook

The Skillbook groups:
- Martial Soul innate capabilities.
- Successfully absorbed Spirit Ring abilities (Ring 1–9).
- Formal techniques taught by instructors/schools/dojos/clans/sects.
- Combat proficiency and practical manoeuvres.
- Arcanistry knowledge and formulations.
- Documented Artificial Artifact functions.
- Profession and life skills.

Every entry shows source/provenance, character compatibility, acquisition/teaching evidence, requirements, proficiency/assessment, actual effects, cost, cooldown and limitations only when defined. Draft, locked, unknown, unlearned, and unverified abilities are not usable. Do not provide one generic skill list to every character at the same Realm; hundreds of Realm-band variations belong to a large, source-grounded catalogue, not automatic individual unlocks.

### 9.3 Library navigation

Bestiary and Skillbook must be reachable from the character/gameplay interface without obscuring the isometric world. Provide search and filters by category, Realm band, Ring source, technique family, location, discovery state and Requirement state where those fields are supported. The library must distinguish **Known to Character**, **Available to Learn**, **Locked by Requirements**, and **Unknown/Undiscovered**. Do not expose hidden data through search suggestions, icons, counts, tooltips or cached previews.

---

## 10. Daily Life, Gathering, Farming and Facilities

These are the everyday activity systems that keep Pocket useful outside combat:

- Eat, rest, sleep, manage HP/Satiety and treat injuries.
- Forage, gather fruit/herbs/materials, collect water, fish or harvest where supported.
- Woodcutting and timber processing.
- Farming and crop care.
- Facility operations, upgrades, storage and construction.
- Shopping, selling, trading and local market activity.
- Travel, explore and discover locations/rumors.
- Participate in local festivals, lessons, public services and community events.

Each activity requires a Pocket data record with its requirements, timer, cost, output, item IDs, failure/interrupt conditions, location and source. An activity cannot grant an undefined reward.

---

## 11. World Events and ambient simulation

World Events use the Universe event lifecycle and data model. Daily routines, minor jobs and ordinary conversations remain local records unless they create persistent wider consequences.

A Pocket event definition must state:
- Stable Event ID and source.
- Trigger and entry Requirements.
- Region/location scope.
- Actors and factions.
- Start/end/duration and Pocket time mapping.
- Player knowledge vs hidden facts.
- Immediate and persistent effects.
- Status: PROPOSED, ACTIVE, RESOLVED, SUPERSEDED, or REJECTED.
- Resolution evidence and links to affected transactions/state.

Do not make events appear merely to keep the screen busy.

---

## 12. Cross-mode progression and anti-exploit rules

- One mode cannot bypass another mode's requirements. Sparring does not grant a Ring; hunting does not automatically grant absorption; a job does not grant a professional Grade; socializing does not automatically create loyalty; War Zone participation does not guarantee rank or loot.
- All mode rewards must use the same currency/item ledger and inventory/asset services.
- All timed processes must use the single Pocket clock and process scheduler.
- All timed actions must be idempotent and auditable.
- Every mode must handle interruption, logout, app restart, time manipulation, death, injury and location change according to a documented rule.
- If a numerical requirement or output is not defined, mark it pending and do not mint the result.

## 13. Required implementation data domains

Before full production implementation, Pocket needs stable data models for:

1. Character, Awakening record, Martial Soul, Spirit Realm, Stage, Ring slot and absorption record.
2. Spirit Beast species, individual specimen, habitat, ecology, target item and Ring-source identity.
3. Spirit Ability, formal Technique, skill family, effect definition and proficiency.
4. Arcanist Focus record, Grade credential, teacher, institution, exam, Formation Engraver, blueprint, material, formulation and Artificial Artifact.
5. Job/employer/contract/shift/wage/payment.
6. NPC, schedule, relationship evidence, agreement/favor and interaction.
7. Hunt, party, target, encounter, combat turn, loot, ring custody and hunt report.
8. Sparring session, opponent, instructor, drill, equipment and result.
9. War Zone operation, active World Event, faction, objective, route, supply, casualty and consequence.
10. Farming plot, crop, growth phase, harvest, facility, recipe, production batch and storage.
11. World location, route, travel process, event trigger and activity definition.
12. Wallet transaction, item movement, provisional gain and reconciliation correction.

All IDs must remain stable across updates and catalogue expansion. Display names may change through authorized content migration; IDs must not be reused for a different entity.
