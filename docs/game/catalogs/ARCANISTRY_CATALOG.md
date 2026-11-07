# Pocket Arcanistry Catalogue — Focus, Grades, Tools, Formulations and Artifacts

**Status: MANDATORY catalogue architecture; progression rules inherit Universe canon.**  
**Universe source pin:** `5a0348dc8f47a3c582dadaeac5ffef423d5cd62c`.

---

## 1. Scope and authority

This is the Pocket index for Arcanistry-related learning, professional certification, tools, materials, formulations, production, and artifacts. It must not create a second progression ruleset.

Primary rules:
- `core/ARCANISTRY_AND_FORMULATION.md` — the single authority for Arcanist Focus, Grade, examinations, production success chance, Formation Engraver requirements, candidate-made artifact gates, and Artificial Artifact Condition Score.
- `world/TIANHAI_ACADEMIES_AND_ARCANIST_INSTITUTE.md` — the four Tianhai Cultivator Academies and the exclusive Tianhai Arcanist Institute's institutional role.
- `world/ARTIFICIAL_ARTIFACTS.md` — known Artificial Artifact catalogue.
- `world/ARTIFACTS_AND_RELICS.md` — origin distinctions and Ancient Artifact/Relic record rules.
- `core/10_ECONOMY_SYSTEM.md` — materials, costs, Wallet and transaction rules.

Arcanist is a person/professional progression; Arcanistry is the field; Arcanism is its underlying doctrine. Do not use these as interchangeable labels.

---

## 2. Learning and certification catalogue

### 2.1 Foundational instruction

Every aspiring Arcanist must learn foundational theory from an actual qualified teacher, dojo, clan, institution, specialist organization or recognized educational source. Self-study, talent, wealth, cultivation and artifact ownership are not replacements.

Each learning-source record must identify:
- Source ID, name, type and location.
- Qualified instructor or responsible department.
- Specific curriculum/knowledge genuinely taught.
- Access conditions, application, fee/scholarship if established.
- Student's enrolment, attendance and assessment evidence.
- Any access limitations/restricted research.

### 2.2 Focus stages

| Order | Official Arcanist Focus | Minimum active practice | Pocket timer |
|---:|---|---:|---:|
| 1 | Pemula | 12 hours | 15 minutes |
| 2 | Initiate | 24 hours | 30 minutes |
| 3 | Beginner | 40 hours | 50 minutes |
| 4 | Ordinary | 60 hours | 1 hour 15 minutes |
| 5 | Ahli | 90 hours | 1 hour 52 minutes 30 seconds |
| 6 | Expert | 120 hours | 2 hours 30 minutes |

Every stage requires actual teacher/institution assessment. Initiate is the Focus gate for the Apprentice Examination; it is not Arcanist Grade 1.

### 2.3 Arcanist Grades 1–10

Grades are professional certification, independent from Spirit Realm. Every Grade advancement requires a registered exam and a pass.

| Grade | Main gate |
|---:|---|
| 1 | Pass Apprentice Examination after Initiate Focus; candidate's marked Engraver's Apprentice; Tier 1 Artificial Artifact exam |
| 2 | Tier 2 exam; Condition Score requirement begins |
| 3 | Tier 3 exam; max 35 passes per 40 actual participants |
| 4 | Tier 4 exam; max 30 passes per 40 actual participants |
| 5 | Tier 5 exam; condition and output-quantity competition; max 20 per 40 |
| 6 | Tier 6 exam; condition and output-quantity competition; max 15 per 40 |
| 7 | Tier 7 exam; personal-designed engraver mandatory; max 10 successful participants |
| 8 | Personal-designed engraver + 10 T6 + 5 T5 + 1 T8 condition Rendah; all candidate-made and currently owned |
| 9 | Personal-designed engraver + at least 30 T8 with condition Baik or Origin; all candidate-made and currently owned |
| 10 | Personal-designed engraver + at least 10 T9 weaponry artifacts with Origin condition, senior recognition, and final exam |

Grade 10 recognition requires at least one recognized Grade 10 or three recognized Grade 9 individuals. Universe limits Grade 10 individuals to no more than five worldwide.

For Grades 3–7, the quota is a cap and not a guarantee. Grade 5–7 competitive ranking needs real cohort evidence; no simulated opponent or invented result may be used.

---

## 3. Production and condition references

### 3.1 Baseline Artificial Artifact work time

| Artificial Artifact Tier | Universe workshop time | Pocket timer |
|---:|---:|---:|
| 1 | 1h | 1m 15s |
| 2 | 2h | 2m 30s |
| 3 | 3h | 3m 45s |
| 4 | 4h | 5m |
| 5 | 6h | 7m 30s |
| 6 | 8h | 10m |
| 7 | 12h | 15m |
| 8 | 18h | 22m 30s |
| 9 | 24h | 30m |
| 10 | 36h | 45m |

A timer completion does not prove production success. Use the official Arcanist Grade × target Tier probability matrix and authorized resolution. Situational modifiers and unresolved production parameters remain pending where Universe leaves them undefined.

### 3.2 Official Artificial Artifact condition

Use exactly these labels:
1. Buruk
2. Rendah
3. Standar
4. Baik
5. Origin

Condition is determined only after successful production using the Universe Condition Score formula. Production success and resulting condition are separate. Do not apply that formula to Relics, Ancient Artifacts, ordinary objects or ordinary buildings.

### 3.3 Pocket Satiety

Pocket workshop and Focus Satiety costs are recalculated using actual real-time awake work duration and the Pocket Satiety formula. Do not charge the Universe's full multi-hour/multi-day reference total after compressing a timer by ×48. See `POCKET_PROGRESSION_AND_HUD.md` for the current Mortal baseline preview and modifier rules.

---

## 4. Tools and equipment catalogue

### 4.1 Engraver's Apprentice

An examination tool bearing a pattern, emblem or identifying mark associated with the candidate's legitimate educational origin or sponsoring tradition. The mark identifies affiliation; it is not an automatic production bonus.

### 4.2 Personal Formation Engraver

A specialized precision tool for engraving intricate formation patterns into Artificial Artifact materials. Exact dimensions, tip diameter, precision grade, durability, repair cost and general price are not established.

The Grade 7–10 gate requires the candidate's own authored blueprint, realized by a qualified forger/toolmaker. The maker must satisfy the appropriate Universe requirements, including Spirit Realm 5 or higher and relevant forging ability where applicable. A purchased or borrowed tool built from somebody else's blueprint does not qualify.

### 4.3 Tool data schema

```yaml
tool_id: "arcanistry.tool.<stable-id>"
name: "Approved name"
tool_type: "engravers_apprentice | formation_engraver | workshop_tool | instrument"
canon_status: "verified | owner_approved_pocket | provisional | unknown"
maker_id: null
owner_id: null
blueprint_id: null
blueprint_author_id: null
manufacture_event_id: null
grade_or_precision: null
supported_tiers: []
materials: []
durability_rule: null
repair_rule: null
price_record_id: null
access_requirements: []
source_refs: []
```

---

## 5. Materials and formulation catalogue

Universe identifies classes of materials and strategic research but does not provide a complete universal recipe or material price catalogue. Pocket must build records only from specific Universe sources or owner-approved Pocket production data.

### Required Material record

```yaml
material_id: "material.<stable-id>"
display_name: "Approved name"
canon_status: "verified | owner_approved_pocket | provisional"
source_refs: []
material_class: "metal | stone | ore | energy_medium | plant | beast_material | component | other"
origin_region: []
provenance_requirements: []
physical_properties: []
spiritual_properties: []
processing_requirements: []
compatible_formulation_ids: []
incompatible_uses: []
tier_or_grade: null
quantity_unit: "approved unit"
local_market_price_ref: null
pocket_spawn_or_supply_rule: null
```

### Formulation / Pattern record

- Stable ID and approved name.
- Creator / research lineage / source.
- Target Artificial Artifact type and permitted Tier.
- Required materials and exact quantities, only if established.
- Formation pattern and engraving instructions or asset reference.
- Required Arcanist Grade, Focus/knowledge, tool and workshop.
- Energy/activation requirement and safety conditions.
- Work time and production resolution reference.
- Failure, interruption and maintenance rules, only where defined.
- Source, version and approval record.

A formulation being listed in the catalogue does not mean the player understands it, owns it, or is qualified to use it.

---

## 6. Artificial Artifact catalogue — imported known entries

The Universe's `world/ARTIFICIAL_ARTIFACTS.md` provides the following known records. Import the detailed source record rather than inventing missing properties:

| Universe ID | Name | Known Tier / status | Confirmed function |
|---|---|---|---|
| AAF-001 | Tianhai Yunzhou Floating Island Support Artifact | Tier 9 | Supports the giant floating island |
| AAF-002 | Tianhai Yunzhou Liquefied-Energy Refining Apparatus | Varies by facility; exact tier unknown | Processes suitable imported energy-bearing ore into compatible liquefied energy |
| AAF-003 | Automated Guideway Train Engine | No universal Tier | Propels automated trains on dedicated guideways |
| AAF-004 | Tianhai Yunzhou Long-Distance Liquefied-Energy Passenger Aircraft | Exact Tier unknown | Long-distance passenger transport between established corridors |
| AAF-005 | Portable Spirit Ring Stasis Artifact | Class reference; model/Tier unknown | Holds a Spirit Ring in stasis for transport; does not grant ownership or bypass absorption |
| AAF-006 | Emergency Area-Concealment Artifact | Tier 8 | One-use wartime device to conceal a vast area and disguise life within it; self-destructs after activation |

The Universe record contains unknown fields for creator, exact materials, formulation, activation, maintenance, failure modes and/or exact specifications. Keep them unknown until a source establishes them.

### Artifact categories

Keep these origins separate:
- **Artificial Artifact:** manufactured by Arcanist using materials, patterns and formulations; production/condition/series records apply.
- **Ancient Artifact:** originated during the golden age; provenance and current function need evidence.
- **Relic:** inheritance/object left by a deity; origin does not automatically establish power/function/tier.

The Universe `world/ARTIFACTS_AND_RELICS.md` states that no individual Relic or Ancient Artifact beyond recorded facts is fully specified in the audited canon. The Pocket index must not invent a filled relic collection.

### Artificial Artifact record schema

```yaml
artifact_id: "artifact.<stable-id>"
universe_catalogue_id: "AAF-XXX"
display_name: "Approved name"
origin_category: "Artificial Artifact | Ancient Artifact | Relic | Unclassified"
tier: null
artifact_type: "weaponry | utility | tool | transport | facility | other | unknown"
maker_id: null
owner_id: null
series_code: null
production_event_id: null
blueprint_id: null
formulation_id: null
materials: []
energy_source: null
condition_label: null
condition_score: null
function_ids: []
activation_requirements: []
operating_limits: []
maintenance_rule: null
weaknesses: []
current_location_id: null
source_refs: []
```

---

## 7. Pocket Arcanistry screens

The Arcanistry hub must provide:

- **My Progress:** Focus, official Grade, teacher, stage assessments, eligibility and next official gate.
- **Education:** institutions, courses, qualified teachers, enrolment and attendance/assessment records.
- **Examinations:** target Grade, registration, fees if established, prerequisites, artifact target, condition, cohort caps and result.
- **Tools:** Engraver's Apprentice, personal Formation Engraver, candidate blueprint, ownership and verification.
- **Materials:** inventory, provenance, availability, price source, processing and storage.
- **Formulations:** known/unknown pattern library, learning/access requirements, compatible materials and artifact types.
- **Workshop:** active process, target Tier, Grade/Tier chance, work time, inputs, output and result.
- **Artifact Collection:** maker, Tier, type, condition, series code, current ownership, bank/storage location and Grade requirement counts.
- **Research / Institute:** Tianhai research areas, restricted-access data, testing and recognized contributions where the character has access.

The HUD must show Arcanist Grade and Arcanist Focus independently, as defined in `POCKET_PROGRESSION_AND_HUD.md`.

---

## 8. Initial catalogue status and approval gates

- Focus stages and Grade rules are imported as mechanics, not as a list of currently learned skills.
- A full materials/formulation catalogue is not present in the audited Universe source; import only specific verified records.
- The known Artificial Artifact entries are AAF-001 through AAF-006 above; unknown properties remain unknown.
- No generic Relic/Ancient Artifact inventory may be fabricated.
- Prices, production recipes, material quantities, durability, and other Pocket-only numerical values require explicit approved content data.
- A player may see a locked or unknown item only when the character has legitimately discovered its existence. The catalogue being present in the application does not mean every character knows its contents.
