"""Cut the paired idle + walking 8-direction reference sheets (9 characters) into per-view cells.  usage: prep9.py outdir
cells are written as <id>_<DIR>.png (idle pose) and <id>W_<DIR>.png (walking pose), white background, floor shadow removed."""
import os, sys, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prep8 import kill_shadow
A = "/mnt/user-data/attachments/5cee2730-b7b2-5389-823a-04cb745c5f53/"
DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
SETS = {  # id: (walking sheet, idle sheet)
    "miko_blue": ("aa6fbb5e", "0e59e7f6"), "samurai": ("e6611450", "c26d6fb0"), "ronin_mask": ("235a307f", "4b5eaece"),
    "elf": ("aec44531", "831c4cbe"), "blindfold": ("c0a744ce", "b2567307"), "maiden": ("2e15bd81", "e7c420ac"),
    "kitsune": ("9adccff9", "0608cdc8"), "priestess": ("459b100e", "633ecb4e"), "hooded": ("d62b99c9", "2a987711"),
}
WALK_X = [0, 221, 443, 664, 886, 1108, 1330, 1551, 1772]
STAND_X = [3, 193, 386, 574, 767, 956, 1151, 1340, 1532]
def borders(g, W, fallback):
    r = [i for i in range(g.shape[0]) if (g[i] < 215).mean() > 0.6]; r0, r1 = r[0], r[-1]
    cf = (g[r0 + 10:r1 - 2] < 215).mean(0); vb = [i for i in range(W) if cf[i] > 0.85]; grp = []
    for i in vb:
        if grp and i - grp[-1][-1] <= 2: grp[-1].append(i)
        else: grp.append([i])
    xs = [(a[0], a[-1]) for a in grp]
    if len(xs) != 9: xs = [(x, x) for x in fallback]
    return r0, r1, xs
def header_bottom(im, r0, r1, x):
    px = im[:, x].astype(int); lav = lambda p: (p[0] - p[2] >= 4) and p.mean() < 251
    i = r0 + 3
    while i < r1 and not lav(px[i]): i += 1
    while i < r1 and lav(px[i]): i += 1
    return i
def main(out):
    os.makedirs(out, exist_ok=True)
    for name, (w, s) in SETS.items():
        for tag, f, fb in (("", s, STAND_X), ("W", w, WALK_X)):
            im = cv2.imread(A + f + "-image.png"); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); H, W = g.shape
            r0, r1, xs = borders(g, W, fb); hb = header_bottom(im, r0, r1, xs[0][1] + 8)
            for i, d in enumerate(DIRS):
                t = im[hb + 2:r1 - 3, xs[i][1] + 4:xs[i + 1][0] - 3].copy(); t = kill_shadow(t); cv2.imwrite(os.path.join(out, f"{name}{tag}_{d}.png"), t)
            print(name, tag or "stand", "rows", hb, r1, "cell", t.shape[:2])
if __name__ == "__main__": main(sys.argv[1])
