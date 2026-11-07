# Ten-Anatomy PXL Comparison Study

This is an isolated comparison sheet, not a production roster. It renders ten genuinely different body rigs with the **same 36×48 frame, ground pivot, face treatment, hair, neutral clothing, palette, camera scale and animation timing**. Differences are carried by the body data: overall height, head-to-body ratio, shoulder breadth, torso length, waist/hip width, arm proportions and leg proportions.

The comparison is deliberately not ten costume recolours. Every candidate has its own anatomy profile and its own PXL rig export. The existing one-base/five-wardrobe study remains untouched and still serves its separate purpose.

## Ten anatomy profiles

| ID | Profile | Primary silhouette distinction |
|---|---|---|
| 01 | Petite | Shorter frame, relatively larger head, narrower shoulders and shorter limbs |
| 02 | Slender | Narrow torso and hips, longer leg line, finer arms |
| 03 | Balanced | The existing neutral reference body |
| 04 | Graceful | Narrower shoulders with fuller hips and a compact waist |
| 05 | Athletic | Wider shoulders, stronger upper arms and balanced legs |
| 06 | Tall | Taller frame with elongated torso and legs |
| 07 | Broad | Wider torso, shoulders and hips |
| 08 | Powerful | Strong shoulders, arms, torso and thighs |
| 09 | Compact | Shorter, denser proportions with a wider trunk |
| 10 | Long-limbed | Narrower torso with longer arms and legs |

The labels describe silhouette targets, not fixed gender, age, personality or gameplay class. They are candidates for visual review; none is automatically approved as the final player roster.

## Consistency rules

- Shared frame: 36×48 px; shared pivot: [18, 46].
- Shared eight headings: N, NE, E, SE, S, SW, W, NW.
- Shared idle and walk timing; every candidate is checked standing and moving.
- Same neutral outfit and palette to reveal anatomy rather than costume variation.
- The head remains slightly larger than a strict realistic ratio; the visible neck stays short and narrow.
- The existing base-study and production sprites are not overwritten.
- PXL is the only character-art source; no SVG or generic vector replacement.

## Build

The dedicated PXL character-preview workflow also builds this folder into ten-anatomy-study/. It produces south-facing idle/walk comparisons and side/back idle comparisons, plus per-character eight-direction animation frames.
