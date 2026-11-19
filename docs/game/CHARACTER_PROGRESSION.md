# Character progression — Meridians, stats and Skill Book (game mode)

Implemented in `review-apk/web/src/game/` (pure logic in `data/progression.js`, `data/skills.js`; panels in `skillui.js`; combat hooks in `combat.js`).

## Rules (from the design brief)
- **Level cap 666** (`LEVEL_CAP`). Content (zones/monsters) currently ends at Lv 100; the XP curve (`expToNext`, `28·lv^1.6`) is a hard grind and keeps working to 666.
- **+3 stat points per level-up** (`POINTS_PER_LEVEL`): 1,995 points from Lv 1 → 666 with a zero start (`TOTAL_LEVEL_POINTS`). Extra points can come from class / specialist weapons / cultivation tier (`flags.hero.bonusPts`).
- **Levelling never raises an attribute.** Points are spent on **Meridian nodes** (the stat node tree). **6 points per node** (`NODE_COST`).
- A node can be activated only if it **touches an active node** (the Origin is always active). **Only active nodes give stats**; unlocking access to a path gives nothing by itself.
- Re-spec: refund a *leaf* node (one nothing else depends on) for 0.6 xc, or reset everything (0.6 xc per active node).

## The web (`NODES`, generated deterministically — 169 nodes)
Six paths from the Origin, 10 rings each (spine + two side lanes), cross-linked at rings 3 / 6 / 9 so it is a web, not six trees. Keystones on the spine at rings 5 and 10.

| Path | Spine | Side lanes |
|---|---|---|
| Tiger Sinew | Strength | ATK % · Crit damage |
| Falcon Eye | Dexterity | Crit chance · Skill damage |
| Crane Step | Agility | Evade · Swing speed |
| Iron Bone | Vitality | Max HP % · HP regen |
| Thunder Breath | Spirit | **Chant Time Reduction** · Skill damage |
| Hidden Gate | a little of everything | EXP gain · Loot & book luck |

The tree is data-driven (`RINGS`, `BRANCHES`): more rings / paths / named nodes can be added without touching the UI (full 1,995 points ≈ 330 nodes).

## Final stats = combined base stats + modifiers (`statsOf(eco)`)
Every source returns `{ flat: {stat: n}, pct: {stat: %} }`; flat values are summed, % are summed and applied on top (cultivation can give bonuses *and* penalties, e.g. `pct: { str: 20, agi: -10 }`).
`SOURCES`: **nodes** (implemented), **equipment**, **class**, **specialist** weapon, **cultivation**, **pets** (all read `flags.hero.*Mods`, empty for now — the extension points).
Derived: ATK = 6 + 2.2·STR + 0.6·DEX · Max HP = 50 + 14·VIT + 2·STR · DEF = 0.5·VIT + 0.25·AGI · swing = 0.95s / (1 + haste) · crit 5% + 0.18·DEX · evade 0.12·AGI · Chant Time Reduction 0.2·SPI + nodes · skill damage 0.6·SPI + nodes. (Placeholders for balancing.)

## Skill Book (`data/skills.js`)
- 14 skills, 5 tiers (Mortal → Heavenly), East-Asian swordsmanship names (placeholders). Types: `hit`, `aoe`, `heal`, `buff`.
- Learn / upgrade (max Lv 5, +14 % power per level) = **skill books** (separate collection, no bag slots) + **materials from tier 2 up** (existing catalogue items such as Iron Ingot, Steel Ingot, Gold Ore…).
- Books drop from monsters in the zones listed per skill: 3.5 % normal, 40 % sub boss, 100 % boss (× Loot & book luck).
- **4 quick slots** (starters: V-Slash, Crescent Moon Sweep, Jade Breath Mending, Iron Mountain Stance). **Auto / Manual** switch: auto fires heal when hurt, buffs before attacks, attacks when ready, only while Auto-grind is on; manual = tap the slot. Skills have a **chant** (channelling time, reduced by Chant Time Reduction) and a cooldown.

## Save data
`flags.hero = { lv, exp, hp, kills, species, nodes: [ids], bonusPts }`, `flags.skills = { lv: {id: n}, books: {id: n}, slots: [id|null ×4], auto }`.

## Not done yet
Equipment / class / cultivation / pets systems (only their hook points exist) · manual targeting without Auto-grind · skill icons (generic icons per type) · balance pass for Lv > 100 · node names/effects beyond the generated set.
