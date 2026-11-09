# r3d - own cel-shaded character renderer (no pxl)

Characters are built from analytic ellipsoids and tapered cylinders, ray-cast orthographically and
point-sampled at pixel centres (crisp pixel art, no anti-aliasing). 5-tone hue-shifted ramps,
dark coloured outlines. Cell 96x128, anchor (48,124), camera pitch 18 deg, 8 yaw directions.

    python3 tools/r3d/build_base.py character-hd          # bare base: body + face (7 expressions)
    python3 tools/r3d/preview_base.py character-hd character-hd/previews

Layers (see character-hd/manifest.json): `body` is the bare base; `face` is a separate layer whose
rows are expressions. Hair (13 parts), outfit parts, hats and tails are separate layers on the same
skeleton and camera (next steps). Needs Python 3 + numpy + Pillow.
