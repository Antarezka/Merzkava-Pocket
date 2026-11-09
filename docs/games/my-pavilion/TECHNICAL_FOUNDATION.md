# My Pavilion — Technical Foundation

## 1. Current technical direction

- **Game form:** Native 3D game, not a 2D pixel-art game.
- **Engine direction:** Godot 4.x with native 3D scenes and systems is the working direction, subject to a playable vertical-slice test and confirmation against the Pocket application architecture.
- **Host target:** Eventual integration into Merzkava Pocket.
- **Current branch state:** Documentation only. No runtime implementation or build is included in this branch at this stage.
- **Camera:** Open decision; do not hard-code a camera assumption into the foundation.

The engine direction reflects the Pocket project's Godot migration direction. It is not a claim that My Pavilion has already been implemented in Godot.

## 2. Integration boundary

My Pavilion must remain isolated from Pocket's main application until it is ready for integration.

Before integration:
- Keep game documents and future game-specific implementation under the My Pavilion project area or an agreed isolated module.
- Do not overwrite existing Pocket game systems, assets, menus, save data, or runtime behavior.
- Do not change the Pocket main branch as part of My Pavilion pre-production.
- Avoid introducing a second embedded game engine or a web/Pixi-based gameplay layer.
- Any eventual integration must use the agreed native Godot architecture and Pocket navigation/lifecycle rules.

## 3. Suggested runtime boundaries

The following separation is recommended for maintainability. Exact class names and scene paths are not yet fixed.

- **Pavilion Runtime:** player interaction, pavilion state, room layout, and facilities.
- **Trade Simulation:** buy/sell transactions, pricing, orders, contracts, and ledger.
- **Inventory and Item Data:** item definitions, quantities, quality, provenance, storage, and display.
- **Supplier Simulation:** supplier catalogues, availability, lead times, reliability, and relationships.
- **Customer Simulation:** customer profiles, requests, budgets, preferences, and shopping behavior.
- **Progression and Reputation:** unlocks, business standing, facility growth, and milestones.
- **Save / Load:** persisted state, schema versions, validation, recovery, and migration.
- **UI Presentation:** catalogue, inventory, supplier board, appraisal, ledger, orders, and management screens.

These boundaries should be validated by the Technical Director during the vertical slice.

## 4. Data-driven content

The item catalogue, supplier definitions, customer archetypes, contracts, and balance values should be data-driven where practical.

An item record should be able to express:
- Stable internal identifier.
- Display name and description.
- Category and subcategory.
- Canonical lore reference or review status.
- Grade, quality, and condition fields where applicable.
- Supplier/source and provenance.
- Base valuation or pricing parameters.
- Storage and display requirements.
- Availability restrictions and tags.

Data validation should catch duplicate identifiers, missing references, invalid categories, and incomplete required fields before content enters a release build.

## 5. Save-system requirements

The save system must be designed before large-scale progression is added.

Minimum considerations:
- Versioned save schema.
- Safe handling of interrupted writes.
- Validation of item IDs and quantities.
- Recovery behavior for invalid or incomplete data.
- Explicit migration rules when the schema changes.
- Tests for closing and reopening the app during transactions or deliveries.
- No silent loss of player progress.

Cloud synchronization or online dependency is not approved by this foundation and must be separately designed if ever proposed.

## 6. Performance and device validation

The game is intended for eventual Pocket integration, so performance must be considered from the first 3D prototype.

Measure at least:
- Frame time and frame-rate stability.
- Memory use and texture residency.
- Scene and asset loading time.
- Draw calls, material count, and overdraw.
- Number of visible animated characters.
- Animation and navigation cost.
- Thermal behavior during longer sessions.
- Save/load duration.

Use quality tiers, LODs, visibility management, texture budgets, and simplified distant animation where appropriate. Do not compromise the approved art direction without testing scalable options first.

No numeric performance target is locked until the team tests representative hardware and agrees on a quality baseline.

## 7. Asset pipeline

The pipeline should define:
- Accepted source formats and export settings.
- Naming conventions and stable asset identifiers.
- Model scale, pivot, orientation, and collision rules.
- Skeleton and animation naming conventions.
- Texture sizes, compression, and material standards.
- LOD and visibility rules.
- Import presets and automated validation.
- Asset provenance and license records.

glTF/GLB may be evaluated as a 3D interchange format, but the final import/export standard must be tested with the chosen asset sources and Godot version.

## 8. Open technical decisions

- Final Godot minor version.
- Final camera model and input behavior.
- World navigation and pathfinding approach.
- Simulation time model and pause behavior.
- Maximum active customer/staff count.
- Item catalogue storage format and authoring tools.
- Save location, backups, and optional synchronization policy.
- Performance budgets and supported device matrix.
- Exact Pocket module/scene integration contract.
