# Pocket Skill, Spirit Ability and Technique Catalogue

**Status: MANDATORY catalogue architecture; individual abilities require verified provenance and approved mechanics.**  
**Universe source pin:** `5a0348dc8f47a3c582dadaeac5ffef423d5cd62c`.

---

## 1. Source audit and design boundary

The audited Universe sources do **not** define a universal table of hundreds of generic skills that automatically unlock at each Spirit Realm. They establish that:
- Martial Soul is the character's core power identity.
- Martial Soul forms and traits are not limited to a closed list.
- A Spirit Ring can expand or combine what the Martial Soul can do.
- A Ring ability must come from the interaction of the owner's Martial Soul, the specific Spirit Beast/Ring characteristics, the ability formulation, and the actual Sync result.
- Formal combat techniques may be learned through qualified instructors, dojos, academies, clans, or other legitimate paths.
- Martial Soul rarity or Spirit Realm alone does not grant a named skill, effect, damage amount, or combat victory.
- Soul-Nyuma and Soul-Zoun may express different treatment/interpretation of the Beast soul, but neither creates a separate Ring formula or bypass.

Pocket must support a large growing library, including hundreds of individual records and variations over time, without pretending that all of them are universal canon skills. A generated variation is a **draft** until the source, requirements and actual effects are approved. It cannot appear as an owned/usable ability merely because its Realm number is high.

---

## 2. Separate ability families

Keep these ability origins distinct in the catalogue and HUD:

1. **Martial Soul innate capability** — verified capability arising from the awakened Martial Soul itself.
2. **Spirit Ability** — ability produced through a successfully absorbed Spirit Ring and its documented interaction with the Martial Soul.
3. **Formal Technique** — technique learned through a legitimate teaching/practice path (dojo, academy, clan, sect, instructor or documented tradition).
4. **Combat proficiency / learned manoeuvre** — practical training records that are not automatically formal techniques or new supernatural powers.
5. **Arcanistry formulation / process** — learned technical knowledge, formulas and production operations; not automatically a combat skill.
6. **Artificial Artifact function** — an object's documented function, usable only with valid ownership/access, activation and operating conditions.
7. **Profession / life skill** — practical capability such as farming, processing, cooking, repair or trade; not a Spirit Ability.

Do not merge all seven into one generic skill-tree node.

---

## 3. Ability architecture

### 3.1 Catalogue record schema

```yaml
ability_id: "ability.<stable-id>"
display_name: "Approved display name"
record_status: "draft | owner_approved_pocket | canon_verified | retired"
ability_family: "martial_soul | spirit_ability | formal_technique | combat_proficiency | arcanistry | artifact_function | life_skill"
source_refs: []
owner_approval_id: null
character_specific: true
applicable_martial_souls: []
ring_source:
  ring_number: null
  beast_id: null
  specimen_id: null
  ring_age_years: null
  age_grade: null
  ring_colour: null
  absorption_record_id: null
formation:
  martial_soul_interaction: "Required explanation"
  beast_trait_interaction: "Required explanation when Ring-based"
  formulation_or_pattern: "Verified or unknown"
  sync_result: "Verified result or unknown"
requirements:
  minimum_spirit_realm: null
  allowed_stages: []
  required_ring_count: null
  required_ring_ids: []
  required_focus: null
  required_arcanist_grade: null
  teacher_or_institution_id: null
  item_requirements: []
  other_gates: []
effects:
  effect_types: []
  values: {}
  target_rules: "Verified or unknown"
  range: null
  duration: null
  cooldown: null
  cost_resource: "Qi | stamina | item | none | unknown"
  cost_value: null
  limitations: []
  counterplay: []
proficiency:
  state: "unknown | learned | practiced | assessed | mastered"
  evidence_refs: []
  progression_rule_ref: null
presentation:
  icon_asset_id: null
  animation_asset_id: null
  sound_asset_id: null
  vfx_asset_id: null
  description: "Player-facing explanation"
```

Unknown mechanics stay null/unknown. Do not translate a null effect into zero damage, free usage, unlimited range, or an unrestricted effect.

### 3.2 Realm and Ring relationship

- Spirit Realm provides progression state and opens a number of Ring slots equal to the Realm number.
- A new Ring ability may only be recorded after that Ring's absorption succeeds.
- The Ring number, Ring source, and actual resulting ability must be linked.
- A character may not use a later Ring ability because its slot is visible or because a skill tree has a node at that Realm.
- Realm/Stage may be a requirement only when the relevant ability's rule or teaching source says so. Do not automatically assign one skill to every Stage or Realm.
- The Universe rules do not require the Pocket library to have identical abilities for every person with the same Ring count.

### 3.3 Technique learning

A formal technique requires a real instruction source, legitimate access, the correct teaching scope, and evidence of actual learning/practice. An instructor who teaches sword fundamentals does not automatically grant all sword techniques. Attending a lesson is not proof of mastery.

Record:
- Instructor / school / dojo / clan / sect.
- Exact technique taught and approved definition.
- Prerequisite knowledge, tools, Realm or Ring gates if they are established.
- Practice hours using Pocket time conversion where applicable.
- Assessment result and demonstrated proficiency.
- What the technique can and cannot do.

---

## 4. Large variation library — how to reach hundreds without fake canon

Pocket content requirement: the skill programme must plan for **hundreds of distinct ability/technique variations across each of the nine Spirit Realm progression bands**, with room for Martial Soul-specific branches and Ring-specific variants. This is a catalogue-production target, not a rule that every character automatically owns hundreds of skills or that the Universe grants fixed skills at each Realm. The library should be expanded in reviewed batches and tagged by its actual prerequisite band, provenance, and character compatibility. A record remains draft/locked until its effect and requirements are approved. No filler duplicates may be counted toward the target.

Pocket may build a large number of ability records by using reusable **skill families** and reviewed variation dimensions. Those dimensions are content-authoring tools; they are not free-form runtime bonuses.

Possible ability families for sorting drafts:
- Offensive / strike / projectile / area effect.
- Defensive / guard / barrier / counter.
- Control / bind / interrupt / displacement.
- Mobility / movement / pursuit / escape.
- Detection / tracking / perception.
- Support / coordination / marking.
- Recovery / stabilisation, only where a documented source gives the effect.
- Utility / environment interaction / tool use.

Variation dimensions can include:
- Martial Soul form and confirmed innate traits.
- Specific Beast species/specimen traits.
- Ring number, actual Ring age/colour, and confirmed Ring characteristics.
- Sync result and permitted degree of control.
- Soul-Nyuma or Soul-Zoun doctrine only where the character is actually affiliated and the distinction affects the ability's documented soul-processing result.
- Learned technique source and the character's demonstrated proficiency.
- Artifact/tool interaction, only when that item function is documented.

**Draft generation pipeline:**

```text
Choose ability family
    ↓
Select a valid Martial Soul / Beast / teaching / artifact source
    ↓
Check the character's actual progression gates
    ↓
Draft the effect and explicit limitations
    ↓
Check against existing abilities for duplicates/conflicts
    ↓
Verify source and mechanics / owner approval if Pocket-only
    ↓
Publish catalogue entry
    ↓
Unlock only for a character who meets the exact requirements
```

Do not generate a fixed number of abilities per Realm as an automatic reward. The target of hundreds of variations is a library-size/content-production goal, not a canon formula.

---

## 5. Combat effect system — data requirements

Every active combat ability must have an explicit effect record before the combat engine can use it:
- Valid target(s) and target count.
- Range/area and line-of-sight restrictions.
- Activation requirement and timing.
- Cost resource and exact cost.
- Effect category (damage, defense, control, displacement, buff/debuff, recovery, information, utility).
- Numeric magnitude only if a source defines it.
- Duration, repeat, stacking and cooldown only if established.
- Interrupt/counter conditions and failure behavior.
- Environmental restrictions.
- Interaction with existing defense, injury and HP systems.
- Provenance and formula version.

The combat engine must not infer damage from the ability's name, animation size, rarity, Spirit Realm or visual effect. A spectacular animation is not a damage formula.

---

## 6. Player skillbook and HUD presentation

Group skills by source:
- Martial Soul.
- Spirit Ring 1–9.
- Formal Techniques.
- Combat Training.
- Arcanistry and Formulations.
- Artifact Functions.
- Profession / Life Skills.

Each record displays:
- Name and family.
- Source/creator/teaching record.
- Owned / locked / learning / unverified state.
- Requirement checklist.
- Current proficiency/assessment state.
- Verified effect and limitations.
- Resource cost/cooldown only if defined.
- Practice or acquisition history.

Do not show an "Equip" or "Use" action for a draft, unknown, not-yet-learned, inaccessible, or unabsorbed skill. Locked entries may show their name/outline only when the character has legitimately discovered the relevant information.

---

## 7. Initial skill catalogue status

No universal per-Realm list of hundreds of skills is imported from Universe. The Pocket catalogue begins with:
- Schema and authoring pipeline established.
- Individual ability records added only after verified character-specific Ring, Martial Soul, teaching, combat, or artifact provenance is available.
- No synthetic placeholder ability can be equipped or used.

This keeps the library extensible while preventing the HUD, AI, or combat engine from granting skills the character never earned.
