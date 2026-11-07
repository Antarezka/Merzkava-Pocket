# Pocket Spirit Beast Catalogue — Canon-Sourced Species and Specimen Index

**Status: MANDATORY catalogue structure; data entries require a verified source or explicit Pocket approval.**  
**Universe source pin:** `5a0348dc8f47a3c582dadaeac5ffef423d5cd62c`  
**Canon mechanics:** `bestiary/SPIRIT_BEAST_RULES.md`, `core/SPIRIT_RING_RULES.md`, `core/TIER_ASSESSMENT_AND_APPRAISAL.md`.

---

## 1. Current source audit

The audited Merzkava Universe `bestiary/` directory contains `SPIRIT_BEAST_RULES.md`, which defines general categories, behaviour, Age Grade, item requirements, hunting difficulty boundaries, and Spirit Ring rules. It does **not** currently provide a populated species-by-species catalogue file.

Regional records identify potential habitats, but many explicitly leave local species and exact hunting grounds unconfirmed. The Azerion Forest example establishes an unnamed Heavenly Beast specimen aged 7,290,422 years; it does not identify a species name or justify creating a species entry from that specimen alone.

**Initial catalogue state: no imported species entries are verified by this index yet.** Do not use generic placeholder species, randomly generated names, fake age ranges, or invented abilities as if they were Universe canon. This catalogue is the required Pocket data destination as proper records are approved/imported.

---

## 2. Classification rules

Every record must distinguish these fields:

### 2.1 Main Beast category

- Ordinary Beast
- Spirit Beast
- Supreme Beast
- Demonic Beast
- Heavenly Beast

Use the Universe definitions for general output, intelligence, behaviour, and Ring relevance. The category alone does not establish an exact power tier, age, Ring colour, or hostility of every individual.

### 2.2 Additional traits (not main categories)

- Rare / unique
- Mutated
- Corrupted
- Other specifically documented condition

A trait tag does not replace the main category. More than one trait may apply only where evidence supports it.

### 2.3 Independent classification fields

Keep these independent:
- Species identity.
- Specimen identity.
- Actual age in years.
- Age Grade 1–9, calculated from actual age.
- Official appraisal Tier or provisional/unassessed state.
- Main Beast category.
- Ring age and Ring colour.
- Danger/capability evidence.
- Habitat and regional population.

**Canonical Spirit Beast Age Grade by actual age**

| Age Grade | Actual age |
|---:|---:|
| 1 | 10–150 years |
| 2 | 151–999 years |
| 3 | 1,000–4,999 years |
| 4 | 5,000–9,999 years |
| 5 | 10,000–49,999 years |
| 6 | 50,000–99,999 years |
| 7 | 100,000–199,999 years |
| 8 | 200,000–499,999 years |
| 9 | 500,000 years and above; no fixed maximum |

Age Grade 9 begins at 500,000 years and has no maximum fixed age. A Beast's age is not its appraisal Tier. Do not use Age Grade as a substitute for the actual Tier or for combat calculations.

**Canonical Spirit Ring colour by actual Ring age**

| Spirit Ring colour | Ring age |
|---|---:|
| White | 10–99 years |
| Yellow | 100–999 years |
| Blue | 1,000–9,999 years |
| Black | 10,000–49,999 years |
| Red | 50,000–99,999 years |
| Orange | 100,000–499,999 years |
| Maroon | 500,000–999,999 years |
| Gold | 1,000,000–1,999,999 years |
| Purple | 2,000,000–3,999,999 years |
| Pink | 4,000,000–6,999,999 years |
| Dark Vienna | 7,000,000–15,000,000 years |

A Beast older than 15,000,000 years is a Heaven Realm being, not an ordinary Spirit Beast with a higher number. No Ring colour above Dark Vienna is established. Do not infer a colour beyond the documented range.

Age Grade is an age bracket, not a power tier. Beast appraisal Tier is not an Age Grade. A Ring colour is determined from Ring age using the Spirit Ring module, not from the main Beast category.


Keep these independent:
- Species identity.
- Specimen identity.
- Actual age in years.
- Age Grade 1–9, calculated from actual age.
- Official appraisal Tier or provisional/unassessed state.
- Main Beast category.
- Ring age and Ring colour.
- Danger/capability evidence.
- Habitat and regional population.

Age Grade is an age bracket, not a power tier. Beast appraisal Tier is not an Age Grade. A Ring colour is determined from Ring age using the Spirit Ring module, not from the main Beast category.

---

## 3. Required catalogue record schema

Every species record should use the following schema. Unknown properties remain unknown rather than being filled from genre expectations.

```yaml
beast_id: "beast.<stable-id>"
display_name: "Known species name"
aliases: []
canon_status: "verified | owner_approved_pocket | provisional | unknown"
source_refs:
  - "Merzkava Universe path and source pin"
main_category: "Ordinary Beast | Spirit Beast | Supreme Beast | Demonic Beast | Heavenly Beast"
trait_tags: []
species_description: "Only established description"
typical_appearance: "Verified or unknown"
intelligence_profile: "Verified or unknown"
temperament_profile: "Verified or unknown"
known_capabilities:
  - ability_id: "beast-ability.<id>"
    description: "Documented effect only"
    evidence_ref: "source"
habitat:
  regions: []
  locations: []
  biome: "verified or unknown"
  depth_or_access: "verified or unknown"
population:
  known_distribution: "verified or unknown"
  season_or_activity: "verified or unknown"
  abundance: "verified or unknown"
age_profile:
  known_specimen_min_years: null
  known_specimen_max_years: null
  age_grade: null
appraisal:
  tier_status: "official | provisional | requires_appraisal | unknown"
  tier_value: null
  appraisal_record_id: null
ring_profile:
  can_produce_spirit_ring: "yes | no | unknown"
  ring_age_range_years: null
  colour_rule_ref: "core/SPIRIT_RING_RULES.md"
  absorption_item_requirements: []
  known_ring_ability_patterns: []
loot_and_resources:
  entries: []
  yield_rules_ref: null
combat_profile:
  attack_patterns: []
  defenses: []
  range_and_mobility: "verified or unknown"
  threat_evidence: []
pocket_spawn_data:
  availability: "disabled_until_configured"
  spawn_weight: null
  encounter_conditions: []
  respawn_duration: null
  pocket_approval_id: null
notes: []
```

### 3.1 Species versus specimen

A species can have many specimens with different ages, conditions, abilities, and threat levels. Keep individual specimen records separate from the species entry. Never assign one specimen's appraisal ruling, age, exact abilities, or Ring details to every member of the species.

### 3.2 Pocket spawn data is separate

The Universe may establish habitat and species but not a Pocket encounter frequency, node refresh timer, regional population weight, spawn chance or guaranteed reward. These are Pocket content data and require explicit approval. Keep spawning disabled until the region, species, population and spawn configuration are ready.

---

## 4. Required filters in the Bestiary UI

The Pocket Bestiary must support:
- Region / location / habitat.
- Main category.
- Additional traits.
- Age Grade.
- Actual specimen age where discovered.
- Official Tier / appraisal status.
- Spirit Ring age and colour.
- Known capabilities and threat notes.
- Target-specific required item.
- Discovery status: unknown, rumor, tracks, seen, identified, appraised, defeated, ring obtained.

The player-facing Bestiary must distinguish **Known to the character** from **World database facts**. Locked entries must not reveal a full hidden profile. A rumor is not a confirmed species/age/tier.

---

## 5. Hunt and absorption integration

- Hunting uses the mode and combat flow in `POCKET_GAMEPLAY_MODES_AND_CATALOGS.md`.
- Spirit Ring eligibility uses `POCKET_PROGRESSION_AND_HUD.md`.
- A hunt must not start from a Beast entry alone; the player still needs a location, valid route and actual target/encounter.
- Defeating a Beast does not grant automatic Ring ownership or successful absorption.
- For Ring 2–9, missing species-specific item requirements must be replaced by a concrete, clearly provisional requirement based on target Beast type/age/traits, as the Universe rule requires. Do not use a blank requirement or silently treat it as waived.
- Keep combat outcome, specimen state, loot, Ring custody, and absorption records separate.

---

## 6. Initial category coverage checklist

The catalogue must eventually cover all five main categories where actual species data becomes available. It should also support rare, mutated and corrupted tags; regional habitat variants; ordinary resource fauna; and individual high-age specimens.

| Coverage group | Catalogue structure | Verified Pocket species entries |
|---|---|---:|
| Ordinary Beast | Required | 0 |
| Spirit Beast | Required | 0 |
| Supreme Beast | Required | 0 |
| Demonic Beast | Required | 0 |
| Heavenly Beast | Required | 0 |

Zero means this Pocket index has not yet imported/approved an individual species record. It does not mean the world contains no such creatures.

---

## 7. Entry approval checklist

Before a species becomes active game content, verify:
1. Name and category are supported by a Universe entry or owner-approved Pocket content record.
2. Region and habitat are supported.
3. Age, Age Grade and appraisal Tier are not conflated.
4. Abilities/behaviour have evidence and appropriate limitations.
5. Ring eligibility and target item requirement are defined or explicitly unresolved.
6. Pocket spawn frequency, encounter and respawn settings are owner-approved and separate from canon.
7. Drops/loot, sell value, processing and resource yield are explicit Pocket data.
8. Source pin and Pocket content version are recorded.

A record that fails these checks may remain an unpublished draft but cannot spawn, drop items, grant a Ring, or resolve combat in live gameplay.
