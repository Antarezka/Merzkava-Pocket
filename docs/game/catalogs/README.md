# Merzkava Pocket — Content Catalogue Index

**Status: MANDATORY catalogue entry point.**  
These catalogues use Merzkava Universe as their canon source and Pocket-only configuration as a separate layer. A catalogue record is not automatically unlocked, known to the player, or enabled for spawning/production.

## Core catalogues

- [Spirit Beast Catalogue](./SPIRIT_BEAST_CATALOG.md) — Beast species/specimen schema, category, Age Grade, appraisal, habitat, Ring requirements, and discovery state.
- [Skill and Technique Catalogue](./SKILL_AND_TECHNIQUE_CATALOG.md) — Martial Soul abilities, Spirit Abilities, formal techniques, combat proficiency, Arcanistry, artifact functions, and life skills.
- [Arcanistry Catalogue](./ARCANISTRY_CATALOG.md) — Focus, Grades, exams, Formation Engravers, materials, formulations, Artificial Artifacts, Ancient Artifacts, and Relics.

## Pocket economy and production catalogue

- [Integrated Economy, Items, Production & Facilities Catalogue](./POCKET_ECONOMY_CATALOG.md) — full 1,000-item listing, gathering/mining/farming/fishing rates, pricing formula, 200 facility build/upgrade specifications, and linked production loops.
- [Items 001–500](./POCKET_ECONOMY_ITEMS_001_500.json) and [Items 501–1000](./POCKET_ECONOMY_ITEMS_501_1000.json) — structured item IDs, prices, acquisition methods, tools, facility Requirements and uses.
- [200 Facilities](./POCKET_FACILITIES_200.json) — location, bill of materials, builder tools/workforce, construction time, upgrades, capacity and outputs.
- [Production Recipes](./POCKET_PRODUCTION_RECIPES.json) — input/output links, processing times and crop/seed relationships.

All item prices, rates, facility costs and timers are Pocket balance data. Currency denominations and the final market pricing formula remain inherited from Merzkava Universe.

## Catalogue governance

1. Use source references and the pinned Universe version for inherited facts.
2. Keep Pocket spawn rates, wages, prices, crop yields, facility output, and other simulation numbers separate from canon.
3. Use stable IDs. Never recycle a retired ID for a different species, skill, item, NPC, or recipe.
4. Preserve unknown fields as unknown. Do not turn missing data into a zero, free action, guaranteed success, or unrestricted skill.
5. Draft entries cannot spawn, drop inventory, grant a Ring, be equipped, used in combat, or count toward an exam until their requirements and approval state are satisfied.
6. Character discovery is separate from the world catalogue. A complete global catalogue must not expose undiscovered knowledge in the player's UI.

## Current audited coverage

| Catalogue | Source audit result | Active imported detail |
|---|---|---|
| Spirit Beasts | Universe has category/rule module but no populated species-by-species catalogue | 0 verified species records |
| Skills / Techniques | Universe defines provenance and formation rules, not a generic per-Realm list of hundreds | 0 universal auto-unlock lists |
| Arcanistry | Mandatory Focus/Grade rules and six known Artificial Artifact catalogue IDs exist | Rules imported; AAF-001–AAF-006 referenced; unknown recipes/material fields remain unknown |
| Ancient Artifacts / Relics | General origin and record rules exist; itemized catalog remains largely unpopulated | No invented entries |

A zero count describes the current imported catalogue, not the absence of such entities in the world.
