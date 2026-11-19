"""Export the clean name-card portrait of every monster (from extract_monsters.py atlases) as a tight-cropped RGBA png.
The ground shadow painted under each portrait is removed; the game animates the portrait as a puppet (breathing, bob, lunge, flash, topple).
Usage: python3 export_monster_cards.py <atlas dir> <out dir>"""
import cv2, numpy as np, json, sys, os
MAXW = 400

def drop_shadow(rgba):
    h, w = rgba.shape[:2]; out = rgba.copy()
    for _ in range(3):   # panel ground line: a bluish row that spans (nearly) the whole width at the very bottom
        ys, xs = np.where(out[..., 3] > 20)
        if len(ys) == 0: break
        bw = xs.max() - xs.min() + 1; y = ys.max()
        if (out[y, :, 3] > 20).sum() >= 0.85 * bw: out[y, :, 3] = 0
        else: break
    # shadow = the pale pixels that hang below the lowest dark outline of the nearby columns
    grey = cv2.cvtColor(out[..., :3], cv2.COLOR_BGR2GRAY); dark = (grey < 125) & (out[..., 3] > 20)
    low = np.full(w, -1)
    for x in range(w):
        col = np.where(dark[:, x])[0]; low[x] = col.max() if len(col) else -1
    near = np.array([low[max(0, x - 6): x + 7].max() for x in range(w)])
    yy = np.arange(h)[:, None]; kill = (yy > near[None, :] + 3) & (yy > 0.6 * h)
    out[kill, 3] = 0
    return out

def tight(rgba, pad=3):
    ys, xs = np.where(rgba[..., 3] > 40)
    return rgba[max(0, ys.min() - pad): ys.max() + pad + 1, max(0, xs.min() - pad): xs.max() + pad + 1]

def main(src, out):
    os.makedirs(out, exist_ok=True); meta = json.load(open(os.path.join(src, "monsters.json"))); res = {}
    for name, m in meta.items():
        a = cv2.imread(os.path.join(src, name + ".png"), cv2.IMREAD_UNCHANGED); x, y, w, h, _ = m["f"]["card"][0]
        c = tight(drop_shadow(a[y:y + h, x:x + w]))
        if c.shape[1] > MAXW: c = cv2.resize(c, (MAXW, int(c.shape[0] * MAXW / c.shape[1])), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(out, name + ".png"), c, [cv2.IMWRITE_PNG_COMPRESSION, 9]); res[name] = [c.shape[1], c.shape[0]]
    json.dump(res, open(os.path.join(out, "sizes.json"), "w"), separators=(",", ":")); print(len(res), "cards", sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024, "KB")

if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
