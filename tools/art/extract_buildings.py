"""Cut the hard-reference buildings (Jiangnan courtyard houses, stilt houses) out of their paper/water backgrounds into crisp RGBA sprites.
usage: extract_buildings.py outdir"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from crisp import crisp, tight_crop
A = "/mnt/user-data/attachments/5cee2730-b7b2-5389-823a-04cb745c5f53/"
JOBS = [  # name, file, crop box x,y,w,h, mode, erase rects (image coords), inpaint rects (image coords), green-erase rect
    ("house_l1", "b297cd13-image.jpg", (70, 5, 640, 470), "stilt", [(365, 355, 175, 90)], [], None),
    ("house_l2", "b297cd13-image.jpg", (0, 495, 736, 480), "stilt", [(480, 725, 140, 100), (0, 860, 150, 130)], [], None),
    ("house_l3", "34a4264d-image.jpg", (425, 70, 300, 220), "paper", [(425, 195, 62, 95), (505, 236, 100, 60), (490, 198, 48, 40)], [(493, 182, 36, 66)], (425, 20, 135, 85)),
]
def mask_for(cell, mode, erase=(), off=(0, 0), green=None):
    hsv = cv2.cvtColor(cell, cv2.COLOR_BGR2HSV); mx = cell.max(2).astype(int); mn = cell.min(2).astype(int)
    if mode == "stilt":
        bg = ((mx - mn) < 22) & (mn > 205)                       # cream paper
        water = (hsv[..., 0] > 70) & (hsv[..., 0] < 112) & (hsv[..., 1] > 28) & (hsv[..., 2] > 45)   # turquoise water
        bad = bg | water
    else:
        bg = ((mx - mn) < 26) & (mn > 168)                        # grey paper
        bad = bg
    if green is not None:
        gx, gy, gw, gh = green; gx -= off[0]; gy -= off[1]; sub = (hsv[..., 0] > 30) & (hsv[..., 0] < 90) & (hsv[..., 1] > 50)
        m = np.zeros_like(bad); m[max(0, gy):max(0, gy + gh), max(0, gx):max(0, gx + gw)] = True; bad = bad | (sub & m)
    for ex, ey, ew, eh in erase: bad[max(0, ey - off[1]):max(0, ey - off[1] + eh), max(0, ex - off[0]):max(0, ex - off[0] + ew)] = True
    fg = (~bad).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1: fg = ((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) * 255).astype(np.uint8)
    return fg
out = sys.argv[1]; os.makedirs(out, exist_ok=True); meta = {}; tiles = []
for name, f, (x, y, w, h), mode, erase, inpaint, green in JOBS:
    im = cv2.imread(A + f)
    for ix, iy, iw, ih in inpaint:
        m = np.zeros(im.shape[:2], np.uint8); m[iy:iy + ih, ix:ix + iw] = 255; im = cv2.inpaint(im, m, 5, cv2.INPAINT_TELEA)
    cell = im[y:y + h, x:x + w]; fg = mask_for(cell, mode, erase, (x, y), green)
    bgra, _ = crisp(cell, fg, scale=3, k=18, sigma=1.6); a = (bgra[..., 3] > 20).astype(np.uint8); er = cv2.erode(a, np.ones((9, 9), np.uint8)); band = (a > 0) & (er == 0); b3 = bgra[..., :3].astype(int)
    rim = band & (b3.mean(2) > 170) & ((b3.max(2) - b3.min(2)) < 70); bgra[..., 3][rim] = 0; bgra[..., 3] = cv2.GaussianBlur(bgra[..., 3], (3, 3), 0)
    bgra = tight_crop(bgra, pad=6)
    cv2.imwrite(os.path.join(out, name + ".png"), bgra); meta[name] = {"w": int(bgra.shape[1]), "h": int(bgra.shape[0])}; tiles.append(bgra)
json.dump(meta, open(os.path.join(out, "buildings.json"), "w"), indent=1)
H = 520; row = []
for t in tiles:
    s = H / t.shape[0]; t2 = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA); bg = np.full((H, t2.shape[1], 3), (150, 185, 205), np.uint8); a = t2[..., 3:4] / 255.0
    row.append((t2[..., :3] * a + bg * (1 - a)).astype(np.uint8))
cv2.imwrite("/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad/buildings.png", np.hstack(row))
