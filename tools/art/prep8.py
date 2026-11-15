"""Cut the 8-direction reference sheets into per-view cells (white background, floor shadow removed).  usage: prep8.py outdir"""
import os, sys, cv2, numpy as np
A = "/mnt/user-data/attachments/5cee2730-b7b2-5389-823a-04cb745c5f53/"
DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
SHEETS = {
    "burgundy8": ("d3244a20-image.png", [(10, 385), (390, 768), (774, 1149), (1155, 1530)], [(104, 506), (604, 1002)], [0]),
    "hoodie": ("11cf74e3-image.png", [(9, 190), (195, 388), (393, 564), (570, 765), (770, 946), (952, 1148), (1154, 1336), (1342, 1527)], [(125, 486)], [0]),
    "nohood": ("11cf74e3-image.png", [(9, 190), (195, 388), (393, 564), (570, 765), (770, 946), (952, 1148), (1154, 1336), (1342, 1527)], [(625, 990)], [0]),
}
def kill_shadow(c):
    """remove the soft lavender ground ellipse under the feet"""
    g = c.astype(int); dark = (g.max(2) < 110); ys = np.where(dark.any(1))[0]
    if len(ys) == 0: return c
    fy = ys.max(); R, G, B = g[..., 2], g[..., 1], g[..., 0]
    sh = (B - R >= 6) & (g.mean(2) > 185) & (g.mean(2) < 244) & (np.arange(c.shape[0])[:, None] > fy - 12)
    sh |= (np.arange(c.shape[0])[:, None] > fy + 1) & (g.mean(2) < 250)
    out = c.copy(); out[sh] = 255; return out
# generic equal-panel 8-direction sheets: (file, top border, bottom border, header bottom, n panels)
EQ = {
    "oni": ("905552f9-image.png", 802, 346), "oniW": ("e4a4ac2a-image.png", 680, 189),
    "seer": ("6ad6e50f-image.png", 771, 359), "seerW": ("09a1f105-image.png", 678, 163),
    "skull": ("0b4c4109-image.png", 770, 351), "skullW": ("a52b275f-image.png", 759, 269),
}
def cut_equal(out):
    for name, (f, bot, hb) in EQ.items():
        im = cv2.imread(A + f); W = im.shape[1]
        for i, d in enumerate(DIRS):
            x0 = int(round(i * W / 8)) + 3; x1 = int(round((i + 1) * W / 8)) - 3
            t = im[hb + 2:bot - 3, x0:x1].copy(); t = kill_shadow(t); cv2.imwrite(os.path.join(out, f"{name}_{d}.png"), t)
def main(out):
    cut_equal(out)
    os.makedirs(out, exist_ok=True)
    for name, (f, cols, rows, _) in SHEETS.items():
        im = cv2.imread(A + f)
        for ri, r in enumerate(rows):
            for ci, c in enumerate(cols):
                d = DIRS[ci] if name != "burgundy8" else DIRS[[0, 1, 2, 3, 4, 5, 6, 7][ci + (4 if r[0] > 500 else 0)]]
                t = im[r[0]:r[1], c[0] + 3:c[1] - 3].copy()
                if name != "burgundy8": t = kill_shadow(t)
                cv2.imwrite(os.path.join(out, f"{name}_{d}.png"), t)
if __name__ == "__main__": main(sys.argv[1])
