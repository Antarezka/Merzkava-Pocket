# My Pavilion — Decision Log

This log distinguishes confirmed project direction from working assumptions and unresolved decisions. Update it when an owner approves a change.

## Confirmed direction

| Topic | Direction |
|---|---|
| Project name | My Pavilion |
| World | Merzkava Universe |
| Core concept | Operate and develop a fantasy trade pavilion |
| Primary genre | Shop / business management simulation |
| Secondary genre | Trade, supply-chain, inventory, and economic management simulation |
| Character reference | Serribaba — 3D chibi fantasy / MMORPG-like proportions |
| Environment reference | Inventive World — modular stylized 3D shop and street interiors |
| Visual basis | Stylized 3D characters and environments; not pixel-art sprites |
| Development isolation | Dedicated branch `game/my-pavilion` |
| Pocket integration | Later, after completion, review, QA, and explicit approval |

## Provisional technical direction

| Topic | Current position | Validation required |
|---|---|---|
| Engine | Godot 4.x native 3D is the working direction | Build a playable 3D vertical slice and validate Pocket compatibility |
| Host | Merzkava Pocket | Confirm integration contract and lifecycle behavior |
| Asset pipeline | Evaluate a Godot-friendly 3D interchange pipeline such as glTF/GLB | Test exact models, rigs, materials, and imports |
| Device performance | Must be mobile-aware from the prototype | Establish supported devices and measurable budgets |

## Open decisions

- Final engine minor version and project architecture.
- Camera type, distance, rotation, and zoom.
- Character proportions and customization depth.
- Final shading and material style.
- Player background and opening scenario.
- Simulation time and pause rules.
- Scope of staff management and customer autonomy.
- Pavilion size, district travel, and expansion model.
- Exact item grade system and category taxonomy.
- Price, supply, demand, currency, and progression formulas.
- Offline and online requirements, if any.
- Save format, backup policy, and synchronization policy.
- Supported language and accessibility scope.
- Final target device matrix and performance budgets.

## Explicit non-decisions

The following are not approved merely by appearing in a reference or proposal:
- The exact faction names or political relationships of supplier groups.
- Any new Merzkava canon item, organization, region, or character.
- Multiplayer, online economy, or cloud synchronization.
- A final camera or control scheme.
- Final purchase or redistribution of the referenced asset packs.
- Release dates, staffing numbers, or shipping commitments.

## Change control

Record each future decision with:
- Date.
- Topic.
- Previous state.
- Approved decision.
- Reason and evidence.
- Approver.
- Documents and systems affected.
