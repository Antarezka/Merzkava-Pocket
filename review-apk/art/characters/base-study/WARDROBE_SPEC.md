# Modular wardrobe specification

Each wardrobe is a separate outfit built around the **same** approved base. It is not a skin texture and not a recolor-only variation.

## Required independent slots

Every style must be represented by distinct source data for:

1. **Hair** — silhouette, length, tying, fringe and rear volume. Hair is baked per PXL head view, but its choice stays separate from the body and garment definitions.
2. **Head accessory** — pin, hairpiece, band, ornament, hood detail or other appropriate piece. It must not be fused into the base skull.
3. **Top** — inner layer, outer upper garment, collar, sleeves, cuffs, sash/belt and any shoulder/arm pieces.
4. **Bottom** — trousers, skirt panels, lower robe, leg wraps and footwear.
5. **Back** — bag, scroll case, sword sheath, paired blades, banner, wings or another role-appropriate item.

All five slots must be independently replaceable in the source configuration. The current study is a PXL build-time asset experiment; it does not yet implement an in-game inventory/equipment screen or runtime swapping.

## Five required identities

| ID | Wardrobe identity | Main silhouette and motion |
|---|---|---|
| `hanfu` | Hanfu | Cross-collar layers, broad sleeves, sash, split lower panels and long hair/ornament. Sleeves and hems lag softly behind turns. |
| `cultivator` | Cultivator | Inner robe, layered outer coat, waist fastening, loose lower robe/trousers, jade detail and a back sword or scroll. The outer hem follows the stride. |
| `long_robe` | Long robe | More formal, longer outer robe, overlapping front panels, broad cuffs and a back layer. The lower panels swing with a little delay. |
| `assassin` | Assassin | Asymmetric short coat, wrapped waist, mobile loose trousers, forearm guards, restrained hood/hair accessory and back blades. It should feel agile, not shrink-wrapped. |
| `sect_guard` | Sect guard / light armor | Layered chest protection, separate shoulder and forearm pieces, segmented waist guards, practical trousers/boots and a back pack or standard. Armor plates must have visible edges and thickness. |

These are five clearly different silhouettes. The clothing category names are not permission to use the same robe with five palettes.

## Cloth behavior — the critical requirement

Use PXL's swept drapes rather than drawing clothing flat against the body:

- `dress()` and `j.sweep()` define a garment as a separate volume.
- Give outer cloth a little clearance through its radius and shell.
- Use `push` so a moving knee or shin tents the cloth instead of passing through it.
- Give the hem a wider radius than the waist; use restrained folds instead of a smooth tube.
- Set `trail` and `sway` so a coat tail or ribbon responds to the walk, then settles. Do not make every garment flap violently.
- Sleeves need their own volume and cuff silhouette. They must not simply recolor the arms.
- Top and bottom must be separate pieces. A long robe can overlap trousers, but it must not erase the legs or feet in the walk cycle.
- A back item needs its own geometry and a stable attachment point behind the torso. Check it from all directions.

Use a different cloth response for each material and cut: wide hanfu sleeves, a layered cultivator outer robe, long formal robe panels, a short assassin coat/scarf, and a guarded/armored silhouette should not all sway identically.

## Separation rule

The base file owns anatomy, face landmarks, pivot, directions and gait. The shared wardrobe file owns generic construction helpers only. Each of the five style files owns its own data. Never put outfit-specific body proportions into the shared base.
