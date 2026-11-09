"""Build the bare base: body strips (8 directions x idle/walk) and the separate face layer.

usage: build_base.py OUT_DIR
  ch_body_base_<move>_<dir>.png   frames left->right (96x128 cells)
  ch_face_default_<move>_<dir>.png frames left->right, expressions stacked top->bottom (rows in manifest)
"""
import sys, os, json, time
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B
from engine import outline_pass, CW, CH

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
MAN = json.load(open(os.path.join(OUT, "manifest.json")))
MOVES = {k: v["frames"] for k, v in MAN["moves"].items()}
FACE_DIRS = MAN["slots"]["face"]["dirs"]; EXPR = MAN["slots"]["face"]["rows"]

def stack(rows):
    nr, nf = len(rows), len(rows[0]); s = np.zeros((CH * nr, CW * nf, 4), np.uint8)
    for r, fr in enumerate(rows):
        for i, f in enumerate(fr): s[r * CH:(r + 1) * CH, i * CW:(i + 1) * CW] = f
    return Image.fromarray(s)

t0 = time.time(); n = 0
for move, nf in MOVES.items():
    for d in B.DIRS:
        bodies, faces = [], {e: [] for e in EXPR}
        for f in range(nf):
            sk, res, cv, Rv = B.render_body(d, move, f / nf)
            bodies.append(outline_pass(res))
            if d in FACE_DIRS:
                for e in EXPR: faces[e].append(B.face_layer(res, cv, Rv, e))
        stack([bodies]).save(f"{OUT}/ch_body_base_{move}_{d}.png"); n += 1
        if d in FACE_DIRS: stack([faces[e] for e in EXPR]).save(f"{OUT}/ch_face_default_{move}_{d}.png"); n += 1
print("files", n, "in %.1fs" % (time.time() - t0))
