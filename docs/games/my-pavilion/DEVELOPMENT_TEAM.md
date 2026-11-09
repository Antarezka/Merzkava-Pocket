# My Pavilion — Development Team

## Purpose

This document defines the disciplines required to build, review, test, and release My Pavilion. It defines **roles and responsibilities**, not confirmed hires or a claim that a staffed team already exists. One person may cover multiple roles during early production, but each responsibility must still have a named owner when work begins.

## 1. Direction and production

| Role | Responsibilities | Decision ownership |
|---|---|---|
| Creative Director | Protect the product vision, tone, and creative identity | Final creative direction |
| Game Director | Keep gameplay, systems, content, and player experience coherent | Overall game-design decisions |
| Lead Producer | Priorities, milestones, resources, risks, and delivery coordination | Production plan and escalation |
| Project Manager / Coordinator | Task tracking, dependencies, meeting notes, and status reporting | Work tracking and coordination |
| Technical Director | Architecture, technical standards, risk assessment, and integration strategy | Technical architecture recommendation |

## 2. Game design and worldbuilding

| Role | Responsibilities |
|---|---|
| Lead Game Designer | Own the complete gameplay design and maintain consistency across systems |
| Systems Designer | Design item systems, progression, reputation, staff, facilities, and simulation rules |
| Economy Designer | Design pricing, demand, scarcity, procurement, margins, and economic balance |
| Trade / Supply-Chain Designer | Design suppliers, distribution, contracts, deliveries, and logistics |
| Gameplay Designer | Design moment-to-moment interactions and player feedback |
| NPC Behavior Designer | Design customer, supplier, and staff behaviors and decision rules |
| Narrative Designer | Write events, dialogue, character stories, and narrative context |
| Lore Researcher / Editor | Verify names, places, factions, commodities, and terminology against Merzkava canon |
| Level / World Designer | Design the pavilion layout, circulation, functional spaces, and surrounding environment |
| Technical Designer | Convert design requirements into implementable rules, data, and tools |

## 3. Engineering and technology

| Role | Responsibilities |
|---|---|
| Lead Gameplay Programmer | Gameplay architecture, integration, code quality, and technical implementation leadership |
| Gameplay Programmer | Transactions, stock, staff, customers, simulation, and interactions |
| UI Programmer | Inventory, catalogues, ledgers, menus, HUD, and interface behavior |
| AI Programmer | Customer, supplier, and staff simulation |
| Tools / Pipeline Programmer | Content authoring tools, import validation, automation, and editor utilities |
| Graphics Programmer | 3D rendering, shaders, lighting, and rendering performance |
| Save-System Engineer | Save/load reliability, versioning, recovery, and data migration |
| Build / Release Engineer | Reproducible builds, build automation, packaging, and release verification |

## 4. Art and animation

| Role | Responsibilities |
|---|---|
| Art Director | Visual consistency, art quality bar, and asset review |
| Character Artist | Character models, outfits, hair, materials, and variations |
| Environment Artist | Pavilion, architecture, streets, landscape, and environment assets |
| Prop Artist | Shelves, furniture, displays, tools, goods, and decorative objects |
| Character Animator / Technical Animator | Rigging, locomotion, interactions, animation state setup, and retargeting |
| VFX Artist | Magical effects, item presentation, trade feedback, and environmental effects |
| UI / UX Artist | Interface layout, visual hierarchy, icons, and interaction feedback |
| Technical Artist | Asset import, scale consistency, material setup, LODs, rig constraints, and performance budgets |

## 5. Audio

| Role | Responsibilities |
|---|---|
| Sound Designer | Store ambience, footsteps, handling goods, transactions, and interface feedback |
| Music Composer | Music themes and adaptive or contextual music |
| Audio Implementer | Connect audio events and mix behavior to the game runtime |

## 6. Quality assurance and testing

| Role | Responsibilities |
|---|---|
| QA Lead | Test strategy, quality criteria, defect triage, and release recommendation |
| Functional QA Tester | Verify each feature against its requirements |
| Regression Tester | Recheck existing systems after code or content changes |
| Economy Tester | Find exploitable pricing, infinite-profit loops, broken demand, and balance problems |
| Gameplay Tester | Evaluate clarity, usability, pacing, and friction |
| Performance Tester | Measure frame time, memory, loading, thermal behavior, and bottlenecks |
| Compatibility Tester | Check supported devices, aspect ratios, input methods, and configurations |
| Localization Tester | Check text correctness, terminology, overflow, and layout |
| Accessibility Tester | Review readability, contrast, interaction clarity, and accessibility options |

## 7. Q&A and player relations

Q&A / Player Relations is **not** the same discipline as Quality Assurance.

| Role | Responsibilities |
|---|---|
| Player Support / Q&A Coordinator | Organize incoming questions, issues, and support requests |
| Community Manager | Communicate updates and gather community observations |
| Player Researcher | Run structured playtests, interviews, and feedback sessions |
| Feedback Analyst | Group repeated feedback, identify patterns, and route findings to owners |
| Documentation Writer | Maintain FAQ, tutorials, known issues, and player-facing guides |

- **QA asks:** Does the product behave correctly and meet its specification?
- **Q&A asks:** What are players asking, misunderstanding, struggling with, or requesting?

Player feedback is evidence for investigation, not an automatic instruction to implement every request.

## 8. Localization and accessibility

- Localization Lead / Translator: translate supported languages.
- Terminology Editor: maintain the approved Merzkava glossary.
- UI Text Reviewer: verify clarity, tone, and text fit.
- Accessibility Specialist: review usability and accessibility requirements.

Canonical terms such as Spirit Realm, Arcanistry, Spirit Beast, and Spirit Ring must not be casually renamed or reinterpreted during localization.

## 9. Specialist roles for this project

The following roles deserve explicit ownership because of the project's subject:
- Trade and Supply-Chain Designer.
- Economy Designer.
- Item / Content Data Designer.
- Lore Researcher / Editor.
- NPC Behavior Designer.
- Save-System Reviewer.
- Asset Licensing and Provenance Reviewer.

## 10. Reporting and approval flow

- Creative Director owns creative direction.
- Game Director owns game-design coherence.
- Technical Director owns technical architecture recommendations.
- Art Director owns visual consistency and art acceptance.
- QA Lead owns test coverage and the quality recommendation.
- Lead Producer coordinates delivery and unresolved blockers.
- The project owner retains final approval for major scope, canon, engine, and integration decisions.

No discipline may unilaterally declare its own work complete when another discipline's review is required. For example, a feature is not release-ready merely because it compiles; it must also satisfy design acceptance and QA criteria.

## 11. Review rule

Every substantial feature should have:
1. A design owner and written acceptance criteria.
2. An implementation owner.
3. An independent reviewer where practical.
4. Test cases and recorded outcomes.
5. A documented status: proposed, in progress, blocked, review, accepted, or rejected.

No actual team members, staffing count, or completed work are implied by this role catalogue.
