# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Merzkava Pocket — Project-Specific Safeguards

These rules supplement the repository's existing specifications. They do not replace or outrank them.

- Read the relevant README, project directives, gameplay specifications, design references, and current implementation before changing a system.
- Treat approved visual references and existing approved UI behavior as hard constraints. Do not redesign, rescale, replace, or reinterpret them unless explicitly requested.
- Preserve the existing pull-cord interaction, CRT treatment, motion timing, activation threshold, reduced-motion support, navigation behavior, and other approved interactions unless the task names them.
- Merzkava Pocket is a 2D isometric location-based simulation, not a free-roam RPG. Do not silently change the product direction.
- Preserve established canon, the five-denomination Xuan currency, and documented boundaries. Do not invent prices, economy rules, progression, or relationship mechanics where the specifications defer them.
- Keep local gameplay, saves, authentication, and developer workflows consistent with the offline-first requirements. Do not introduce an internet dependency into developer/offline flows.
- Do not move, replace, expose, or reuse signing keystores or secrets. Preserve repository-specific signing workflows.
- Do not merge workbench changes into main, trigger a release, or build/publish an APK unless explicitly requested.
- Verify visual changes with an actual preview or screenshot when possible. A successful build alone does not prove visual correctness.
