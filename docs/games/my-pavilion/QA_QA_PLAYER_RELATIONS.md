# My Pavilion — QA, Testing, Q&A, and Player Relations

## 1. Purpose

This document separates product verification from player communication and defines the minimum testing process required before a feature or release can be accepted.

**QA** verifies product behavior and quality. **Q&A / Player Relations** collects and responds to player questions and experience feedback. They work together but are not interchangeable.

## 2. QA responsibilities

### Functional testing
- Verify every feature against written acceptance criteria.
- Test normal, boundary, and invalid inputs.
- Verify inventory changes, transactions, deliveries, and contracts.
- Check UI state, navigation, and feedback after actions.

### Regression testing
- Re-test related systems after code or content changes.
- Protect existing save data and previously working gameplay.
- Keep a repeatable smoke-test suite for critical paths.

### Economy and simulation testing
- Search for infinite-profit loops and unintended item duplication.
- Test supplier availability, delivery delays, and stock depletion.
- Check pricing, demand, margins, and contract incentives.
- Look for degenerate strategies that trivialize progression.
- Verify that simulation outcomes remain explainable to the player.

### Performance and compatibility testing
- Measure frame time, memory, loading, thermal behavior, and stability.
- Test representative low-, mid-, and high-capability devices once the device matrix is approved.
- Check orientation, aspect ratios, input, app lifecycle, interruptions, and resume behavior.
- Test long sessions and high-density pavilion scenes.

### Data and save testing
- Save and load across application restarts.
- Test interrupted writes and invalid save data.
- Verify schema upgrades and migration.
- Check that item IDs, quantities, contracts, and balances remain consistent.

### Content and localization testing
- Check item names, descriptions, classifications, and lore references.
- Detect duplicate or missing identifiers and broken catalogue references.
- Check translated strings, truncation, overflow, and terminology consistency.

## 3. Defect severity

| Severity | Meaning | Expected handling |
|---|---|---|
| Blocker | Prevents launch, corrupts saves, or makes the build unusable | Stop release; fix and retest |
| Critical | Major progression or core trade loop is broken; severe exploit or data loss | Fix before release |
| Major | Important feature is broken or materially misleading | Fix or obtain explicit exception before release |
| Minor | Limited defect with a viable workaround | Prioritize by impact |
| Cosmetic | Visual or audio defect without functional impact | Schedule based on visibility and polish |

Every defect report should include:
- Title and severity.
- Build/version and device/configuration.
- Reproduction steps.
- Expected result and actual result.
- Reproduction rate.
- Screenshot or recording when useful.
- Related feature and regression coverage.
- Verification status after the fix.

## 4. Q&A and player relations

Q&A / Player Relations should:
- Maintain a structured FAQ and known-issues list.
- Categorize player questions and repeated confusion.
- Run surveys, structured playtests, and interviews.
- Identify onboarding and usability problems.
- Communicate confirmed fixes and known limitations.
- Route actionable findings to Game Design, UX, QA, or Production.

Do not promise features or release dates before they are approved. Do not treat a single suggestion as proof of a universal player need.

## 5. Player research methods

Use more than one feedback channel:
- Moderated playtests with observation.
- Short task-based tests (for example: receive a delivery, inspect an item, restock a display).
- Post-session questions.
- In-game or external feedback forms where approved.
- Repeated-question and support-topic analysis.

Record what the player attempted, where they hesitated, what they understood, and whether they completed the task. Separate observed behavior from the player's proposed solution.

## 6. Feature acceptance gate

A feature is ready for acceptance only when:
1. Its design and acceptance criteria are documented.
2. The implementation is reviewable and does not introduce known high-risk regressions.
3. Functional tests pass.
4. Relevant economy, save, performance, compatibility, and localization tests pass.
5. Known defects are recorded and triaged.
6. A reviewer other than the sole implementer has checked the result where practical.

## 7. Release quality gate

A release candidate must have:
- No open Blocker defects.
- No open Critical defects unless the project owner explicitly accepts a documented exception.
- Core game loop smoke tests passing.
- Save/load and recovery tests passing.
- Performance results on the agreed device matrix.
- Asset license/provenance review completed.
- Release notes and known issues documented.
- A tested build artifact and recorded source revision.

## 8. Independence

The person who implements a feature should not be its only tester or final approver. QA reports findings independently and can recommend blocking a release when the quality gate is not met.
