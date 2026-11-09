# Human character pipeline (hand-drawn base -> 48x64 game strips)

Source of truth for the body: `art/base/user-base-sheet.png` (16x8 cells, drawn by the project owner).

    python3 tools/slice_base.py base/user-base-sheet.png /tmp/cells 28   # 3x block-vote downscale + 28-colour palette
    python3 tools/build_body.py /tmp/cells base/body                      # 8 directions, idle(4) + walk(8)  -> base/body, anchors.json
    python3 tools/dress.py base/body dressed                              # 5 hairs x 5 outfits x 8 dirs      -> dressed/*.png
    node <claude-pxl>/bin/pxl.js build human-character-base.px.js ...     # (done by scripts/build-world-assets.mjs)

Needs Python 3 with Pillow, numpy, scipy. The APK build only needs Node: `dressed/` is committed.

## Where each direction comes from
| dir | walk | idle |
|---|---|---|
| e / w | owner's run cycle (sheet row 5, 8 frames), w = mirror | profile pose + breathing |
| se / sw | owner's 3/4 walk frames (row 2, flipped to face right), sw = mirror | narrowest 3/4 stance + breathing |
| s | puppet of the owner's front pose (foot lift, hand swing, body bob) | breathing |
| n | puppet of the owner's back pose | breathing |
| ne / nw | derived: back pose with head turn (no 3/4-back drawing in the sheet yet) | breathing |

Not used by the game yet: punch (row 6) and meditate (row 7) cycles, plus the 2nd copy of each 8-frame cycle.
Clothes/hair are recoloured from the base pixels (luminance-preserving) plus extra geometry (skirt, sash, collar, cuffs, hair mass, knot/tail).
