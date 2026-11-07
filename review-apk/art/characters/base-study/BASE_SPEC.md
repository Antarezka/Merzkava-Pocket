# Base anatomy specification

## Target

One ordinary human body, with the head only a little larger than the current attempt. It must not become a super-deformed/chibi body.

| Property | Study target | Reason |
|---|---:|---|
| Body rig height | 36 px | Keep the current field-sprite scale class |
| Frame | 36 × 48 px | Leave a little clear space above the head and below the pivot |
| Pivot | [18, 46] | Keep the feet planted consistently |
| Head field radius | about 5.7 px | A modest increase from the previous 5 px head field |
| Body landmark ratio | 2.85 heads | Slightly larger head, without shortening the limbs into a chibi silhouette |
| Visible neck gap | about 1.3 px | Head should sit close to the shoulders; no long exposed neck |
| Directions | 8 | n, ne, e, se, s, sw, w, nw |
| Moves | idle + walk | Judge the anatomy both still and in motion |

The head radius and head-count value are starting study values, not an approved final. Inspect the rendered blocks and pixel views before changing them. The face should remain legible at game scale without turning into a huge cartoon head.

## Anatomy that must stay normal

- A real shoulder line and a torso with visible depth; do not shrink the chest to make the head look larger.
- A natural waist and hip width, with the legs carrying a normal share of the total height.
- Upper and lower arms remain distinct; hands stay near the waist/crotch in the resting pose rather than floating outward.
- Thighs and shins remain separate and long enough to read as ordinary legs.
- Short neck, but not a missing neck: it should connect into the head and collar cleanly.
- One stable floor line and identical pivot across all eight views.

## Fixed base values

The PXL source's `STUDY_BASE_BODY`, `STUDY_FRAME`, `STUDY_PIVOT`, face anchor and gait are shared by all six render targets: the neutral base and five wardrobe variants.

A wardrobe may change the visible outside of the body by adding cloth, padding, armor or accessories. It may **not** alter:

- `h`, `heads`, `hip`, `torso`, `neck`
- `thigh`, `shin`, `upper`, `fore`, `ankle`
- `hips`, `shoulders`, frame size or pivot
- walk timing, foot lift, gait phase or direction order

The base approval pass must be completed before those values are treated as locked.
