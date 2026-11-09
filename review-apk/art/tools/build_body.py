"""Assemble the user's hand-drawn base into 48x64 body strips for the Merzkava rig.

Input : cells made by slice_base.py  (cell_<row>_<col>.png, 48x64, 28-colour palette)
Output: OUTDIR/body_<dir>_<move>.png  (single-row strips, 48x64 cells)  + anchors.json

Sources (everything is the user's own drawing; nothing is repainted):
  e/w  walk  = run cycle, row 5 (cols 0-7), w = mirror
  se/sw walk = 3/4 walk frames, row 2 (flipped to face right where needed), sw = mirror
  s    walk  = puppet from front standing frame r1c1
  n    walk  = puppet from back standing frame  r1c6
  ne/nw walk = puppet from back frame with a head turn, nw = mirror
  idle (4 frames) = breathing bob of a standing frame per direction
"""
import sys, os, json
import numpy as np
from PIL import Image

CELLS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
W, H = 48, 64

def cell(r, c, flip=False):
    a = np.array(Image.open(f"{CELLS}/cell_{r}_{c}.png"))
    return a[:, ::-1].copy() if flip else a

def shift(a, dx=0, dy=0):
    out = np.zeros_like(a)
    ys, xs = np.mgrid[0:H, 0:W]
    ny, nx = ys + dy, xs + dx
    ok = (ny >= 0) & (ny < H) & (nx >= 0) & (nx < W)
    out[ny[ok], nx[ok]] = a[ys[ok], xs[ok]]
    return out

def over(base, top):
    m = top[..., 3] > 0
    out = base.copy(); out[m] = top[m]; return out

def rows(a, y0, y1):
    out = np.zeros_like(a); out[y0:y1] = a[y0:y1]; return out

# ---------------------------------------------------------------- puppet (front/back)
HIP0, HIP1 = 49, 51      # static hip band (rows 49..50)
FOOT0 = 56               # rows >= FOOT0 belong to the lifted foot/shin
CX = 24                  # split between left and right leg

def puppet(a, k, move):
    """front/back standing frame -> frame k of an idle(4) or walk(8) cycle."""
    if move == "idle":
        bob = [0, 1, 1, 0][k]; lift = (0, 0); hand = (0, 0)
        torso_dx = 0
    else:
        bob = [0, 0, -1, -1, 0, 0, -1, -1][k]                  # body rises at the passing poses
        liftL = [0, 1, 2, 1, 0, 0, 0, 0][k]; liftR = [0, 0, 0, 0, 0, 1, 2, 1][k]
        lift = (liftL, liftR)
        sw = [1, 1, 0, 0, -1, -1, 0, 0][k]                       # hands swing opposite to the leg
        hand = (sw, -sw)
        torso_dx = 0
    canvas = np.zeros_like(a)
    # legs below the hip band
    legs = rows(a, HIP1, H)
    for side, (x0, x1) in enumerate(((0, CX), (CX, W))):
        part = np.zeros_like(legs); part[:, x0:x1] = legs[:, x0:x1]
        lo = rows(part, FOOT0, H); hi = rows(part, HIP1, FOOT0)
        canvas = over(canvas, hi)
        canvas = over(canvas, shift(lo, 0, -lift[side]))
    canvas = over(canvas, rows(a, HIP0, HIP1))
    # head + torso (rows < HIP0): vertical resample with edge duplication, so a bob never opens a gap
    upper = vshift(rows(a, 0, HIP0), 0, HIP0, bob)
    if move == "walk":
        for side, (x0, x1) in enumerate(((0, 19), (30, W))):
            sub = upper.copy(); sub[:, :x0] = 0; sub[:, x1:] = 0
            upper[:, x0:x1] = 0
            upper = over(upper, vshift(sub, 43, HIP0, hand[side]))
    canvas = over(canvas, upper)
    # close the hairline gap a rising torso leaves between torso and hip band
    return canvas

def vshift(a, y0, y1, d):
    """move rows y0..y1-1 by d; the row that would open a gap repeats its neighbour."""
    out = a.copy()
    for y in range(y0, y1):
        src = y - d
        if src < y0 and d > 0 and y0 > 0: out[y] = a[y0] if y - d < y0 and y < y0 + d and False else a[y0]
        elif src < y0: out[y] = 0 if y0 == 0 else a[y0]
        elif src >= y1: out[y] = a[y1 - 1]
        else: out[y] = a[src]
    return out

def head_turn(a, dx):
    """shift head rows right/left by dx (used to fake a 3/4 back view for NE)."""
    out = a.copy(); head = rows(a, 0, 30); out[0:30] = 0
    return over(out, shift(head, dx, 0))

# ---------------------------------------------------------------- source frame choices
S_STAND = cell(0, 0)          # front, neutral face
N_STAND = cell(0, 5)          # back
E_PROFILE = cell(2, 3)        # profile facing right, standing
R_FACING = {0, 1, 2, 3, 7}    # row-2 frames that already face right
def se_frame(c): return cell(1, c, flip=c not in R_FACING)
SE_WALK_IDS = [9, 5, 4, 2, 7, 6, 8, 10]   # 8 smooth, similar-stride frames from the row (chain order, every other)
E_RUN_IDS = list(range(8))

def strip(frames):
    s = np.zeros((H, W * len(frames), 4), np.uint8)
    for i, f in enumerate(frames): s[:, i * W:(i + 1) * W] = f
    return Image.fromarray(s)

def mirror(frames): return [f[:, ::-1].copy() for f in frames]

moves = {}
# --- front / back (puppet)
moves["s"] = {"idle": [puppet(S_STAND, k, "idle") for k in range(4)], "walk": [puppet(S_STAND, k, "walk") for k in range(8)]}
moves["n"] = {"idle": [puppet(N_STAND, k, "idle") for k in range(4)], "walk": [puppet(N_STAND, k, "walk") for k in range(8)]}
# --- east (real run cycle used as the walk), idle bob of the profile pose
def bob_frame(a, k, split=46):
    d = [0, 1, 1, 0][k]; up = rows(a, 0, split); lo = rows(a, split, H)
    return over(lo, shift(up, 0, d))
moves["e"] = {"idle": [bob_frame(E_PROFILE, k) for k in range(4)], "walk": [cell(4, c) for c in E_RUN_IDS]}
# --- south-east (real 3/4 walk)
se_walk = [se_frame(c) for c in SE_WALK_IDS]
se_idle_src = min((se_frame(c) for c in range(16)), key=lambda f: int((f[44:, :, 3] > 0).sum()))   # narrowest stance
moves["se"] = {"idle": [bob_frame(se_idle_src, k) for k in range(4)], "walk": se_walk}
# --- north-east (derived: back puppet with the head turned toward the camera-right)
turned = head_turn(N_STAND, 1)
moves["ne"] = {"idle": [puppet(turned, k, "idle") for k in range(4)], "walk": [puppet(turned, k, "walk") for k in range(8)]}
# --- mirrors
for src, dst in (("e", "w"), ("se", "sw"), ("ne", "nw")):
    moves[dst] = {m: mirror(fr) for m, fr in moves[src].items()}

anchors = {}
for d, mv in moves.items():
    for m, frames in mv.items():
        strip(frames).save(f"{OUT}/body_{d}_{m}.png")
        for i, f in enumerate(frames):
            ys, xs = np.where(f[..., 3] > 0)
            head = f[: ys.min() + 24, :, 3] > 0
            hy, hx = np.where(head)
            anchors[f"{d}_{m}_{i}"] = {"top": int(ys.min()), "bottom": int(ys.max()), "headCx": float((hx.min() + hx.max()) / 2), "headTop": int(hy.min())}
json.dump(anchors, open(f"{OUT}/anchors.json", "w"), indent=0)
print("strips:", sum(len(v) for v in moves.values()), "dirs:", sorted(moves))
