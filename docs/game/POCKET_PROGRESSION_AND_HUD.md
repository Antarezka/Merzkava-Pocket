# Merzkava Pocket — Mandatory Character Progression and HUD Specification

**Status: MANDATORY — gameplay state and HUD contract**  
**Canon reference pin:** Merzkava Universe `5a0348dc8f47a3c582dadaeac5ffef423d5cd62c`  
**Related Pocket authority:** `POCKET_SIMULATION_RULES.md`

This document defines how Pocket represents and validates the player's character progression. It does not invent a parallel canon system. Universe mechanics are authoritative for eligibility and results; Pocket-specific timers are authoritative only for Pocket pacing.

---

## 1. Character progression is multiple independent tracks

The character screen must not collapse all progression into one level or one bar. At minimum, keep these tracks separate:

1. **Martial Soul Awakening** — whether the character has not awakened, is undergoing the procedure, or has completed it; includes the revealed Martial Soul and its confirmed rarity/traits.
2. **Spirit Realm progression** — Mortal or one of the nine Spirit Realms, each with its own Early, Middle, Late, and Peak Stage.
3. **Spirit Ring collection and absorption** — number of successfully absorbed rings, open slots, current Sync progress/cap, next-ring cooldown, and eligibility.
4. **Arcanist Focus** — the last focus stage actually assessed and passed.
5. **Arcanist Grade** — official professional Grade 1–10, granted only by a passed official/recognized examination.
6. **Combat and learned techniques** — abilities with verified origins, unlock requirements, costs, effects, and proficiency records.
7. **Condition and needs** — HP, Satiety, Qi or pre-ring stamina, injuries, and condition effects.
8. **Life and social progression** — employment, institutional memberships, NPC relationships, assets, education, and reputation records where supported.

Spirit Realm and Arcanist Grade are independent. A high Spirit Realm does not grant Arcanist Grade. An Arcanist Grade does not grant Spirit Realm, Qi, combat victory, or a Martial Soul.

## 2. Awakening state and requirements

### 2.1 Eligibility and routes

- Martial Soul Awakening can take place only at age **four years or older**.
- Awakening reveals the character's Martial Soul. It does not grant a Spirit Ring or a Spirit Realm by itself.
- The general public route is organized once every **two in-world years after New Year**. Assigned officials or cultivators visit villages according to local schedules and quotas; never assume a team is always present.
- A resident may use a regional city service when the service and staff are actually available.
- The three major powers named in the Universe module each have exactly one Grand Martial Soul Awakening Hall at the centre of their main civilization: Golden Dragon Empire, Tianhai Yunzhou, and Beiming Gu. These are not a chain of branches.
- Awakening routes, fees, subsidy, proof token, and debt treatment are region-specific. The Golden Dragon Empire rules must not be applied to Tianhai Yunzhou, Beiming Gu, Wanluo, or Lawless Territories without a local canon rule.

**Golden Dragon Empire fees only:**
- Independent paid route: 3 xg 25 xs service, 8% service tax (26 xs), 15 xs documentation, and 10 xs proof token; total **3 xg 76 xs**.
- Biennial public subsidized route: the subsidy pays service, tax, and documentation; the individual pays only **10 xs** for the proof token.
- A token verifies the recorded awakening event; it does not guarantee an academy place, job, special status, or better result.

Pocket converts the two-year public cycle through the approved simulation clock only when presenting the local in-game calendar. A city service can be used only when the scene confirms that it is available. Do not invent universal regional prices or a universal service schedule.

### 2.2 Awakening result procedure

The Universe awakening module requires a single unbiased rarity draw, then a separate player choice before a single mutation draw:

| d100 result | Martial Soul rarity | Chance |
|---:|---|---:|
| 1–30 | Common | 30% |
| 31–57 | Uncommon | 27% |
| 58–77 | Rare | 20% |
| 78–89 | Epic | 12% |
| 90–97 | Legendary | 8% |
| 98–100 | Myth | 3% |

- The form must be based on known and legitimate character/family evidence. Martial Soul forms are not limited to a fixed list.
- Rarity does not automatically establish abilities, attributes, combat strength, or lineage.
- After the rarity result, the player may stop or choose to risk mutation.
- If the player stops, no mutation draw occurs.
- If the player continues, make exactly one mutation draw: 1–10 = mutation occurs (10%); 11–100 = no mutation (90%).
- Mutation may be beneficial or harmful. Do not invent mutation sub-chances or automatic benefits.
- Keep the rarity draw, provisional inherent-quality appraisal, and mutation result as distinct records.
- Do not award Spirit Realm, Stage, Qi, Spirit Ring, formal technique, or combat victory from Awakening alone.

**Pocket implementation:** store the random result, method, timestamp, selected route, player's stop/continue choice, mutation outcome (if attempted), final Martial Soul record, and source reference. Never reroll because the player dislikes the result.

## 3. Spirit Realm progression and Ring prerequisites

### 3.1 The nine Spirit Realms and four Stages

| Realm number | Canonical name | Open Ring slots at that Realm |
|---:|---|---:|
| 1 | Spirit Initiate | 1 |
| 2 | Spirit Adept | 2 |
| 3 | Spirit Elder | 3 |
| 4 | Spirit Monarch | 4 |
| 5 | Spirit King | 5 |
| 6 | Spirit Ancestor | 6 |
| 7 | Spirit Emperor | 7 |
| 8 | Spirit Sovereign | 8 |
| 9 | Spirit Primordial | 9 |

Each Spirit Realm has four Stages: **Early, Middle, Late, Peak**. Mortal is the pre-Realm state, not Spirit Realm 0. Ring slots are capacity, not proof of successful absorption.

### 3.2 State transition order

Pocket must preserve this sequence:

```text
Mortal — not Awakened
    ↓ valid awakening event (age >= 4)
Mortal — Awakening complete / Martial Soul revealed
    ↓ valid Ring 1 acquisition + eligible absorption
Spirit Realm 1 — Spirit Initiate
    ↓ cultivation / Sync / all breakthrough gates / Ring 2 succeeds
Spirit Realm 2 — Spirit Adept
    ↓ ...
Spirit Realm 9 — Spirit Primordial (maximum; 9 rings)
```

A UI animation, countdown, level-up toast, or player claim must not perform a transition. The state changes only after the relevant official process is resolved successfully and committed to the save. If a transition's exact Stage result is not yet established, retain the confirmed Realm and mark the Stage as unresolved; do not guess.

### 3.3 Ring 1 — first absorption

A Mortal may attempt Ring 1 only after Martial Soul Awakening has completed.

Ring 1 requirements:
- Martial Soul Awakening is complete and verified.
- A physical Spirit Ring is available and was obtained through a legitimate route.
- The character's actual condition, compatibility, and absorption readiness satisfy the applicable rules.
- The absorption process is resolved using the Universe formula and Pocket's adapted timer only where a time rule applies.

Ring 1 does **not** require a previous Ring, a Realm bottleneck, or an inter-ring cooldown. Awakening alone does not create a ring. The ordinary target-Beast breakthrough item requirement in the bestiary applies to a subsequent breakthrough, not as an invented universal extra condition for the first Ring.

On successful Ring 1 absorption, create the first Ring record, initialize Qi at the canon base of 100, and record the officially established Spirit Realm transition. On failure, do not add the ring, slot, Qi, or Realm.

### 3.4 Ring 2 through Ring 9 — sequential hard gates

Ring N may only be attempted after Rings 1 through N−1 have each been successfully absorbed in sequence. A player cannot skip a ring number, absorb a later ring because its slot is visible, or use an unfilled slot as proof of eligibility.

For every Ring 2–9, validate **all** of the following before beginning absorption:

1. The prior Ring N−1 is recorded as successfully absorbed and all preceding Ring records are intact.
2. The character is at the required Spirit Realm progression gate for the next transition.
3. Sync progress satisfies the official bottleneck: the gap between current progress and the active cap is **less than 10 percentage points**.
4. Pocket cooldown for the prior successful absorption has reached exactly **0**.
5. The target Spirit Beast/ring is physically available and has been legitimately obtained; location and ownership/distribution are valid.
6. The mandatory item for that target Beast is available. If the Universe bestiary has not recorded a species-specific item, establish a clearly marked provisional target-specific requirement using Beast type/age and relevant characteristics. Never treat a missing entry as “no requirement”.
7. Body condition, Martial Soul compatibility, Satiety, Qi, and all other applicable absorption gates pass.
8. The official compatibility, absorption success, deviation, injury, and anomaly rules are resolved using their source modules.

If any hard gate fails, the absorption success chance is **0%**. Do not add a Ring, Qi, slot, power, Spirit Realm, ability, or skill. A forced attempt may only apply consequences permitted by the official deviation and injury mechanics; do not invent a punishment.

### 3.5 Pocket Ring cooldowns

Use the exact Pocket-only cooldown schedule from `POCKET_SIMULATION_RULES.md`:

| After successful absorption | Next Ring | Pocket wait |
|---:|---:|---:|
| 1 | 2 | **20 seconds** |
| 2 | 3 | 15 hours |
| 3 | 4 | 1 day 21 hours |
| 4 | 5 | 3 days 18 hours |
| 5 | 6 | 7 days 12 hours |
| 6 | 7 | 15 days |
| 7 | 8 | 22 days 12 hours |
| 8 | 9 | **30 days** |
| 9 | — | Maximum reached; no timer |

The cooldown is one separate eligibility gate. When it reaches zero, the player still needs a legitimate target ring, item, Sync/bottleneck, body readiness, and every other requirement. Ring 9 is the cap; never create Ring 10.

**Important timer distinction:** the 20-second to 30-day table is the *post-absorption inter-Ring cooldown*, not the active time spent performing the next Ring absorption. The audited Universe source defines minimum intervals between successful absorptions but does not define a per-Ring active absorption-process duration. Pocket must store these as separate fields: `inter_ring_cooldown` and `absorption_process_duration`. The latter remains pending until the owner approves a Pocket schedule; never reuse the cooldown value as the active absorption duration.

### 3.6 Ring record and ability provenance

For each successful Ring, store:
- Ring number and slot number.
- Source Beast ID and specific specimen ID.
- Beast category, verified/provisional tier, actual age, and Age Grade.
- Ring age, color, and source evidence.
- Acquisition route, party/ownership agreement, location, and event.
- Compatibility formula version and inputs, cap result, Sync progress, and result.
- Required item ID and consumption/ownership transaction.
- Absorption timestamp, success result, Qi update, power state update, and any injury/deviation.
- The actual Spirit Ability/abilities created, including their source, Martial Soul interaction, limitations, and learned mastery state.

Do not grant an ability before the Ring is successfully absorbed. Do not assume every same-species Beast creates an identical ability in every Martial Soul.

## 4. Spirit Realm and body HUD values

### 4.1 HP

Use the exact Universe HP maximum table, including the correct Realm and Stage:

| State | Early | Middle | Late | Peak |
|---|---:|---:|---:|---:|
| Mortal | — | — | — | 100 |
| Spirit Initiate | 150 | 200 | 250 | 300 |
| Spirit Adept | 375 | 450 | 525 | 600 |
| Spirit Elder | 700 | 800 | 900 | 1,000 |
| Spirit Monarch | 1,150 | 1,300 | 1,450 | 1,600 |
| Spirit King | 1,825 | 2,050 | 2,275 | 2,500 |
| Spirit Ancestor | 2,800 | 3,100 | 3,400 | 3,700 |
| Spirit Emperor | 4,075 | 4,450 | 4,825 | 5,200 |
| Spirit Sovereign | 5,650 | 6,100 | 6,550 | 7,000 |
| Spirit Primordial | 7,488 | 7,975 | 8,463 | 8,950 |

HP current value persists. A Realm/Stage transition changes maximum HP only; it does not refill current HP. HP 0 is permanent character death under the current Universe rule. The Pocket HUD must not convert it into an ordinary unconscious state.

### 4.2 Satiety

Satiety is 0–100 and uses the adapted Pocket formula in `POCKET_SIMULATION_RULES.md`: actual real-world awake time for the need meter, not ×48 simulation time. Keep the Universe modifiers, meal effects, protected sleep rule, and one-decimal display precision where valid.

### 4.3 Qi and pre-Ring stamina

- Before Awakening, a Mortal has **Qi = 0** and uses stamina.
- After Awakening but before Ring 1, Qi is **not yet formed**; do not show a positive Qi bar.
- After Ring 1 succeeds, base Qi begins at **100**.
- After that, Qi base is a function of successfully absorbed Ring count using the Universe formula: `Qiₙ = round(100 × 452341^((n−1)/8))`.
- Use the source module's exact reference table/rounding for display. Current Qi changes only through supported spending or recovery mechanics.
- Pocket may show a Mortal Stamina bar only after a separate approved stamina value, maximum, spend, and recovery rule exists. Do not reuse HP or invent a stamina cap.

## 5. Arcanist progression — independent certification path

### 5.1 Mandatory education and Focus

Arcanist is a separate knowledge/profession track. The player must first receive foundational instruction from a real qualified teacher, dojo, clan, institution, specialist organization, or recognized educational source that genuinely teaches Arcanistry. Self-study alone, talent, wealth, Spirit Realm, Martial Soul rarity, or owning an artifact does not replace this.

The official Focus stages, passed in order, are:

1. Pemula
2. Initiate
3. Beginner
4. Ordinary
5. Ahli
6. Expert

A teacher/institution assesses demonstrated progress at each stage. Completing the timer or attending lessons is not automatic approval.

**Pocket-converted minimum focused practice**

| Focus stage | Universe active hours | Universe schedule | Pocket practice timer |
|---|---:|---:|---:|
| Pemula | 12h | 4 training days | 15 minutes |
| Initiate | 24h | 8 training days | 30 minutes |
| Beginner | 40h | 14 training days | 50 minutes |
| Ordinary | 60h | 20 training days | 1 hour 15 minutes |
| Ahli | 90h | 30 training days | 1 hour 52 minutes 30 seconds |
| Expert | 120h | 40 training days | 2 hours 30 minutes |

Passing Initiate Focus makes the student eligible to register for the Apprentice Examination. It does **not** award Grade 1.

### 5.2 Grade 1 — Apprentice Examination

Requirements:
- Legitimate foundational Arcanistry education.
- Passed and recorded Initiate Focus.
- Registration for the Apprentice Examination through Tianhai Arcanist Institute or a formally recognized examination arrangement.
- Candidate's legitimate Engraver's Apprentice examination tool, bearing their educational-origin/sponsoring-tradition mark.
- A completed Tier 1 Artificial Artifact production examination and all required assessments.
- The candidate must pass the actual exam.

Only a passed Apprentice Examination grants Arcanist Grade 1. The mark on the Engraver's Apprentice identifies affiliation; it does not grant a bonus or exemption.

### 5.3 Grade 2–7 advancement

Every Grade requires registration, applicable established fee, target-Grade eligibility, the required examination, and an actual pass.

| Target Grade | Required exam artifact | Additional pass conditions |
|---:|---|---|
| 2 | Artificial Artifact T2 | Condition assessment mandatory |
| 3 | T3 | Condition assessment; max 35 passes per 40 actual participants |
| 4 | T4 | Condition assessment; max 30 passes per 40 actual participants |
| 5 | T5 | Condition and output-quantity comparison; max 20 passes per 40; competitive ranking |
| 6 | T6 | Condition and output-quantity comparison; max 15 passes per 40; competitive ranking |
| 7 | T7 | Condition assessment; personal-designed engraver; max 10 successful participants; competitive ranking |

For Grades 3–6, quotas are caps, not guaranteed pass counts. Grade 5–7 ranking must use actual recorded cohort/output/condition evidence; do not invent competing candidates. Grade 2 onward requires the official Artificial Artifact Condition Score as specified by Universe.

### 5.4 Grade 7–10 personal engraver gate

Before registering for Grade 7, 8, 9, or 10, the candidate must:
- Personally design and establish authorship of their Formation Engraver blueprint.
- Have a qualified maker physically realize that exact candidate design.
- Own and present the resulting engraver for verification.
- The maker must meet the applicable Universe requirements, including Spirit Realm 5 or higher and relevant forging ability where the source applies.

Buying, borrowing, or commissioning somebody else's blueprint does not qualify.

### 5.5 Grade 8–10 candidate-made artifact requirements

All artifacts counted here must have been made by the candidate, remain currently owned by them at eligibility check, and have verified identity/series code, Tier, type, condition, and production records. Bank storage may count only when ownership and presentation can be verified.

| Target Grade | Mandatory qualifying artifacts |
|---:|---|
| 8 | At least 10 T6 + 5 T5 + 1 T8 with condition exactly **Rendah** |
| 9 | At least 30 T8, each condition **Baik** or **Origin** |
| 10 | At least 10 T9 **weaponry** Artificial Artifacts with condition **Origin**, plus qualifying senior recognition and final exam |

Grade 10 recognition:
- At least one officially recognized Grade 10, **or** three officially recognized Grade 9 individuals.
- Recognition must be genuine and issuer-verified; a token cannot be purchased as a substitute for the issuer's consent.
- The candidate must pass the final Grade 10 exam.
- Universe has no more than five Arcanist Grade 10 individuals worldwide.

### 5.6 Production requirements and artifact data

- Arcanist Grade determines the normal artifact-tier ceiling and baseline production chance. Use the exact Grade × Tier matrix from the Universe source.
- Focus, mental ability, stamina, materials, pattern/formulation understanding, and tool suitability are relevant; numeric modifiers remain undefined unless the Universe source establishes them.
- The official five artifact condition labels are **Buruk, Rendah, Standar, Baik, Origin**. Use the Universe CS formula only for successfully completed Artificial Artifacts.
- Relic, Ancient Artifact, and Artificial Artifact are distinct origins. Do not apply Artificial Artifact manufacturing history or condition scoring to Relics or Ancient Artifacts.
- Every Artificial Artifact has series-code/provenance and maker/ownership information.

**Pocket workshop time** follows §4 of `POCKET_SIMULATION_RULES.md`: Tier 1–10 work time is converted by ×48. A completed timer does not guarantee production success, condition, examination pass, or Grade.

### 5.7 Pocket Satiety cost for Focus/work

Pocket Satiety uses actual real awake time, not the full Universe active-hour table. For a normal Mortal, normal body condition, no missed meal windows, and Sedang activity (A = 1.75):

```text
Pocket Satiety cost =
  (Pocket active hours / 24) × 100 × 1.75
```

| Focus stage | Pocket timer | Pocket baseline Satiety cost |
|---|---:|---:|
| Pemula | 15m | 1.8 |
| Initiate | 30m | 3.6 |
| Beginner | 50m | 6.1 |
| Ordinary | 1h 15m | 9.1 |
| Ahli | 1h 52m 30s | 13.7 |
| Expert | 2h 30m | 18.2 |

| Artifact Tier | Pocket timer | Pocket baseline Satiety cost |
|---:|---:|---:|
| 1 | 1m 15s | 0.2 |
| 2 | 2m 30s | 0.3 |
| 3 | 3m 45s | 0.5 |
| 4 | 5m | 0.6 |
| 5 | 7m 30s | 0.9 |
| 6 | 10m | 1.2 |
| 7 | 15m | 1.8 |
| 8 | 22m 30s | 2.7 |
| 9 | 30m | 3.6 |
| 10 | 45m | 5.5 |

These are baseline previews, not fixed prices or universal costs. Recalculate through the Pocket Satiety formula if activity intensity, body condition, missed meal windows, Spirit Realm, or special modifiers differ. If an unattended process does not represent continuous character work, do not charge continuous focused-work Satiety merely because the timer continues while the app is closed.

## 6. Mandatory Character HUD

### 6.1 Persistent compact HUD

The primary progression badge must express the character's current state in a single clear sequence:

- `Mortal · Not Awakened`
- `Mortal · Awakening in Progress`
- `Mortal · Awakening Complete`
- `Spirit Realm N · [Canonical Realm Name] · [Early/Middle/Late/Peak Stage]`

The Awakening substate is shown only while the character is still Mortal. Once a Spirit Realm transition is officially recorded, show the exact Realm and Stage; do not keep presenting the character as simply `Awakened` instead of their actual Spirit Realm. `Mortal` is never labelled Spirit Realm 0.

The isometric gameplay screen must keep the most decision-relevant character information visible without blocking the world view.

**Persistent HUD rows:**

| Row | Must display |
|---|---|
| Location/time | Current area/location, Pocket simulation date/time, local weather when established |
| Needs | HP current/maximum bar; Satiety current/100 bar |
| Progression status | Mortal or exact Spirit Realm + Stage; Awakening state where still Mortal |
| Arcanistry | Arcanist Grade and Arcanist Focus as separate values |
| Wallet | Five Xuan denominations: xc, xs, xg, zj, az |

The layout may use a collapsible character drawer to save vertical space, but the two Arcanist fields and the main progression state must remain quickly accessible with one tap. Do not hide important eligibility behind a deep settings page.

### 6.2 Expanded character drawer

The expanded drawer must contain:

**Identity and Awakening**
- Name and age.
- Status: Mortal / Spirit Realm N — exact canonical name and Stage.
- Awakening state: Not eligible by age, Not awakened, Pending, or Completed; only use states the data model can prove.
- Martial Soul: known name/form, rarity, verified traits; unknown values remain visibly unknown.
- Awakening proof/record and route where one exists.

**Spirit Realm and Rings**
- Spirit Realm and Stage.
- Filled Ring count / available slot count.
- Nine-slot display in the correct order; each slot is Empty, Available, In Process, Absorbed, or Locked only when that exact state is grounded by progression.
- Spirit Ring Absorption: exact canonical status and Day left.
- Current Sync progress / cap.
- Qi state/value and relevant PowerScale/compatibility details.
- Target ring and all missing requirements when the player inspects the next absorption.

**Arcanistry**
- Arcanist Grade (official grade or exactly `???` if personal grade is unverified).
- Arcanist Focus (last passed stage; `Belum dimulai` only when known not started; otherwise `Belum ditetapkan`).
- Foundational teacher/institution and learning record.
- Next Focus assessment and Apprentice/Grade examination eligibility.
- Formation Engraver / Engraver's Apprentice and blueprint authorship where relevant.
- Candidate-made Artifact counts by Tier, condition, type, series code and current ownership.
- Senior recognition/token status for Grade 10 eligibility.
- Formulations/materials known and currently available.

**Condition and belongings**
- HP and Satiety.
- Qi only after formed; Mortal stamina only if an approved Pocket stamina mechanic exists.
- Injury list, class, recovery progress, treatment requirement and functional effects.
- Equipment, Inventory, Assets, Bank/Storage, active jobs/processes and current contract.

**Skills**
- Martial Soul innate capabilities, each successfully absorbed Ring ability, learned formal techniques, Arcanistry knowledge/formulations, and artifact functions must be shown as separate provenance groups.
- Each usable skill shows its unlock source, requirements, current proficiency, valid effects, cost, cooldown, and any limitations only when these are known/implemented.
- Locked/unknown skills must not be shown as owned or usable. A Ring slot, realm level, high rarity, or Arcanist Grade alone does not grant an invented skill.

### 6.3 Exact default-state examples

**Mortal, not awakened:**
- Status: `Mortal`
- Awakening: `Not awakened`
- Martial Soul: `???`
- Spirit Ring Absorption: ``not eligible yet`` | `??? Day left`
- Qi: `0`
- Arcanist Grade: `???` unless officially verified
- Arcanist Focus: `Belum dimulai` only if source state confirms no training

**Mortal, Awakening complete, no Ring yet:**
- Status: `Mortal`
- Awakening: `Completed`
- Martial Soul: recorded result and rarity
- Spirit Ring Absorption: ``eligible`` | `??? Day left` only if first-Ring character/process requirements pass; otherwise ``not eligible yet`` | `??? Day left`
- Qi: `belum terbentuk (belum ada cincin)`

**Spirit Realm 1–8:**
- Show exact Realm/Stage and verified Ring count.
- Show canonical `Spirit Ring Absorption` mapping.
- `eligible` requires every character/process gate; cooldown zero alone is insufficient.

**Spirit Realm 9:**
- Status: Spirit Realm 9 — Spirit Primordial and recorded Stage.
- Spirit Ring Absorption: ``max`` | `∞ Day left`.
- No tenth slot, no further Ring absorption action.

### 6.4 HUD behavior rules

- When HP or Satiety changes, update immediately and show the cause.
- When Realm/Stage changes, recompute only the HP maximum and other fields the source explicitly says change. Do not refill current HP automatically.
- When a ring succeeds, update ring count, slot fill, Qi, cooldown, Sync state, ability record, and Realm transition as supported by the resolution. Apply all updates atomically.
- When the Arcanist Focus stage is assessed, update Focus only; do not update Grade until the official exam is passed.
- When a Grade exam is passed, update Grade only after eligibility, requirements, evidence, and result are committed.
- A countdown reaching zero changes only the time gate. It must not auto-trigger hunt, absorption, training assessment, artifact production success, exam pass, or social reward.
- Use descriptive blocked-requirement text (e.g. `Ring 1 not yet absorbed`, `Sync gap 12.4 — must be below 10`, `required target item missing`); never reduce the player to a generic red lock icon without explaining what is missing.
- No UI value may be derived from an unverified assumption or guessed from rarity/name/artwork.

## 7. Source-of-truth and update policy

- Awakening: `core/MARTIAL_SOUL_AWAKENING.md` and `core/MARTIAL_SOUL.md`.
- Realm, Stage, and breakthrough: `core/CULTIVATION_SYSTEM.md`.
- Ring requirements, compatibility, Sync, Qi, and ring ability formation: `core/SPIRIT_RING_RULES.md`.
- Beast target and required item: `bestiary/SPIRIT_BEAST_RULES.md` plus a specific Beast record when available.
- Arcanist Focus, Grade, examinations, production, tools, and artifacts: `core/ARCANISTRY_AND_FORMULATION.md`.
- HP and Satiety: `core/HP_SYSTEM.md`, `core/HUNGER_AND_METABOLISM.md`.
- Pocket time adaptation: `POCKET_SIMULATION_RULES.md`.

When Universe adds or changes a formula, Pocket must record the Universe source pin and compare the affected fields before migration. A canon change must not overwrite existing player history without a traceable migration rule.

## 8. Unresolved rule — character age progression

The ×48 Pocket simulation clock makes the world calendar advance rapidly. Automatically aging characters at ×48 would age them by four in-world years in only 30 real days. The current Universe modules establish age eligibility and the public awakening cycle but do not define a Pocket age-progression policy.

**Until the owner approves an age policy, do not automatically increase player-character age from the accelerated simulation clock.** Keep the recorded character age stable and store elapsed simulation age separately as a pending design decision. Do not silently alter birthdays, age-gated eligibility, or existing character profiles.
