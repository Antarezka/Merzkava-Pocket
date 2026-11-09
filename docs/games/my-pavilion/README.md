# My Pavilion

> **Project status:** Pre-production / documentation foundation  
> **Repository:** Merzkava Pocket  
> **Working branch:** `game/my-pavilion`  
> **Integration status:** Standalone project documentation only; not merged into the Pocket application.

## Project identity

**My Pavilion** is a 3D fantasy trade-pavilion management simulation set in the Merzkava Universe. The player operates and develops a specialist marketplace for unusual goods: Arcanistry instruments and artifacts, minerals, medicinal ingredients, poisons, Spirit Beast materials, equipment, expedition loot, and other world-relevant commodities.

- **Primary genre:** Shop / business management simulation.
- **Secondary genres:** Trade and supply-chain management, inventory and economic simulation, fantasy management.
- **World setting:** Merzkava Universe.
- **Visual foundation:** Stylized 3D fantasy; chibi MMORPG-like character proportions based on the Serribaba sample as a visual reference, paired with modular stylized 3D shop and street environments referencing Inventive World.
- **Game format:** A management simulation with customers, suppliers, stock, appraisal, contracts, reputation, and pavilion expansion.
- **Intended host:** Merzkava Pocket, after the game is complete and passes the agreed integration gates.
- **Engine direction:** Native Godot 4.x 3D is the working technical direction for compatibility with the Pocket project's Godot direction. It remains subject to a playable 3D vertical-slice and device-performance validation before being treated as final.
- **Camera:** Not decided. Isometric, rotatable isometric, and other 3D management-camera options remain open.

My Pavilion is **not** a TCG shop simulator, a pixel-art game, or a replacement for Pocket's existing game systems. It is a separate game project being developed in this branch.

## Core fantasy

Build a respected pavilion that connects producers, merchant organizations, specialist clans, artisans, hunters, explorers, and customers from across the world. The player does more than place products on shelves: they negotiate supply, judge goods, manage scarcity, fulfill contracts, and build a reliable trade network.

## Core gameplay loop

1. Discover suppliers, their specialties, terms, stock, and delivery conditions.
2. Negotiate or accept procurement and distribution contracts.
3. Receive goods and inspect their identity, quality, grade, condition, and provenance.
4. Store, catalogue, price, and display items in the pavilion.
5. Serve customers, fulfill requests, and complete wholesale or special orders.
6. Reinvest income and reputation into staff, facilities, storage, services, and new trade relationships.

## Main documentation

| Document | Purpose |
|---|---|
| [Game Foundation](GAME_FOUNDATION.md) | Genre, premise, core loop, gameplay pillars, and content scope |
| [Development Team](DEVELOPMENT_TEAM.md) | Roles, responsibilities, ownership, and review structure |
| [Art Direction](ART_DIRECTION.md) | Character and environment references, visual rules, asset requirements |
| [Technical Foundation](TECHNICAL_FOUNDATION.md) | Engine direction, architecture principles, open technical decisions |
| [QA and Player Relations](QA_QA_PLAYER_RELATIONS.md) | QA strategy, test coverage, Q&A, feedback handling, quality gates |
| [Production Plan](PRODUCTION_PLAN.md) | Development phases and conditions for Pocket integration |
| [Decision Log](DECISION_LOG.md) | Confirmed direction, provisional decisions, and unresolved questions |

## Branch isolation and integration rule

All My Pavilion design and implementation work must remain on `game/my-pavilion` until the project is explicitly approved for integration. Do not modify Pocket's main branch or merge this branch into the app merely because the initial documents are complete.

A later integration must be deliberate: review the completed game, confirm technical compatibility with Pocket, validate assets and licenses, complete QA, and then prepare a reviewed merge or integration pull request.

## Current scope boundary

This branch currently establishes the project's documentation foundation. It does not claim that gameplay, assets, engine scenes, save systems, or builds have been implemented. Unresolved choices are marked as open or provisional in the relevant documents.
