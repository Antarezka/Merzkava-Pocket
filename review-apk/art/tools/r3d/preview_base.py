"""Compose contact sheets from the built atlases (checks the files, not the renderer).
usage: preview_base.py ATLAS_DIR OUT_DIR"""
import sys, os, json
import numpy as np
from PIL import Image
A, O = sys.argv[1], sys.argv[2]; os.makedirs(O, exist_ok=True)
M = json.load(open(f"{A}/manifest.json")); CW, CH = M["cell"]["w"], M["cell"]["h"]
EXPR = M["slots"]["face"]["rows"]; FD = M["slots"]["face"]["dirs"]
# 1. dimension check against the manifest
bad = 0
for mv, v in M["moves"].items():
    for d in M["dirs"]:
        im = Image.open(f"{A}/ch_body_base_{mv}_{d}.png"); ok = im.size == (CW * v["frames"], CH); bad += not ok
        if d in FD:
            fi = Image.open(f"{A}/ch_face_default_{mv}_{d}.png"); bad += fi.size != (CW * v["frames"], CH * len(EXPR))
print("atlas dimension errors:", bad)
def frame(path, f, row=0): im = Image.open(path).convert("RGBA"); return im.crop((f * CW, row * CH, (f + 1) * CW, (row + 1) * CH))
def comp(d, mv, f, expr="neutral"):
    im = frame(f"{A}/ch_body_base_{mv}_{d}.png", f)
    if d in FD: im.alpha_composite(frame(f"{A}/ch_face_default_{mv}_{d}.png", f, EXPR.index(expr)))
    return im
S = 2; BG = (112, 150, 118, 255)
sheet = Image.new("RGBA", (8 * CW * S, 8 * CH * S), BG)
for r, d in enumerate(M["dirs"]):
    for f in range(8): sheet.alpha_composite(comp(d, "walk", f).resize((CW * S, CH * S), Image.NEAREST), (f * CW * S, r * CH * S))
sheet.convert("RGB").save(f"{O}/preview_base_walk_8dir.png")
S = 4; crop = (14, 30, 82, 96); w, h = (crop[2] - crop[0]) * S, (crop[3] - crop[1]) * S
ex = Image.new("RGBA", (w * 4, h * 2), BG)
for i, e in enumerate(EXPR): ex.alpha_composite(comp("s", "idle", 0, e).crop(crop).resize((w, h), Image.NEAREST), ((i % 4) * w, (i // 4) * h))
ex.convert("RGB").save(f"{O}/preview_base_expressions.png")
# turnaround: 8 directions idle at 3x
S = 3; ta = Image.new("RGBA", (8 * CW * S, CH * S), BG)
for i, d in enumerate(M["dirs"]): ta.alpha_composite(comp(d, "idle", 0).resize((CW * S, CH * S), Image.NEAREST), (i * CW * S, 0))
ta.convert("RGB").save(f"{O}/preview_base_turnaround.png")
