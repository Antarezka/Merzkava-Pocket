# My Pavilion — Production Plan

## Status

Pre-production documentation foundation. No gameplay implementation, asset integration, or release build is claimed by this plan.

## Phase 0 — Foundation

Objectives:
- Confirm game identity and scope.
- Establish development roles and decision ownership.
- Review Merzkava lore boundaries and terminology.
- Review character and environment references.
- Define the technical risks and open decisions.
- Establish a project asset and license register.

Exit criteria:
- Core concept is approved.
- Initial gameplay pillars are documented.
- Art references and license status are recorded.
- Engine/camera decisions are either approved or have a test plan.
- Vertical-slice scope is agreed.

## Phase 1 — 3D vertical slice

Build one small but representative pavilion experience.

Must demonstrate:
- A representative 3D character and usable animation.
- A representative interior and functional furniture.
- A small set of suppliers and items.
- Receiving, appraisal, inventory, display, and selling.
- Customer behavior and basic trade feedback.
- A simple business ledger.
- Save/load through a restart.
- Performance measurement on representative target hardware.

Exit criteria:
- The complete trade loop can be played.
- Visual direction works at the selected camera distance.
- The technical architecture can support planned content.
- QA reports no unresolved Blocker or Critical issues.
- The project owner approves the next production phase.

## Phase 2 — Production

Expand the systems and content after vertical-slice approval:
- Supplier network and contracts.
- Item catalogue and provenance.
- Customer archetypes and demand.
- Pavilion construction and expansion.
- Staff and operational roles.
- Reputation and progression.
- Events, special orders, and regional trade.
- Audio, VFX, UI polish, and accessibility.

Production should be feature-driven with defined acceptance criteria and regular integration testing.

## Phase 3 — Alpha

Alpha means all planned major systems are implemented in an incomplete or unpolished form.

Priorities:
- Complete the core progression and management systems.
- Eliminate major design gaps.
- Validate the economy and save architecture.
- Reach broad functional feature coverage.
- Establish a stable content pipeline.

## Phase 4 — Beta and release candidate

Priorities:
- Content completeness.
- Balance and exploit testing.
- Performance and compatibility.
- UI, onboarding, accessibility, localization, and audio polish.
- Regression, save migration, interruption, and long-session testing.
- Release documentation and known-issues review.

## Phase 5 — Pocket integration

My Pavilion may be integrated into Merzkava Pocket only after explicit approval and completion of the integration gate.

### Required integration gate
- The My Pavilion scope and design are approved.
- A playable game build exists and has passed the release-quality checks appropriate to the integration milestone.
- Engine and scene architecture are compatible with Pocket's approved Godot architecture.
- Input, lifecycle, navigation, pause/resume, and exit behavior are tested inside Pocket.
- Save data ownership, storage location, schema versioning, and migration are reviewed.
- Performance is validated on the target device matrix.
- Third-party asset licenses and attribution obligations are checked.
- No unresolved Blocker or Critical issue remains.
- A reviewed pull request or equivalent integration change is prepared.

## Merge policy

Do not merge `game/my-pavilion` into `main` just to expose the documents or because pre-production is complete. Keep the project isolated until the owner explicitly approves integration. Documentation can be reviewed independently without merging runtime code.
