"""Cut modular parts (hair, robes, collars, sashes, weapons) out of reference sheets and re-trace them smooth.

usage: python3 -I extract_parts.py <sheet.jpg> <regions.json> <outdir>
regions.json: [{"prefix":"hair_a","box":[x,y,w,h],"min_area":6000,"k":6,"sigma":5.0}, ...]
Parts inside a region are split by connected components and numbered left-to-right.
"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crisp import cutout

OUTLINE_BGR = (54, 44, 59)   # plum-brown ink


def retrace(cell, scale=6, k=6, sigma=5.0, seed=1):
    cell = cv2.copyMakeBorder(cell, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg = cutout(cell, near_white=225, chroma=16)
    h, w = cell.shape[:2]
    up = cv2.resize(cell, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), scale * 0.9)
    a = np.clip((a.astype(np.float32) - 127) * 3.0 + 127, 0, 255).astype(np.uint8)
    cl = cv2.bilateralFilter(up, 9, 20, 6)
    inside = cv2.erode(a, np.ones((3, 3), np.uint8)) > 127
    data = cl[inside].reshape(-1, 3).astype(np.float32)
    if len(data) > 150000: data = data[np.random.default_rng(seed).choice(len(data), 150000, replace=False)]
    cv2.setRNGSeed(seed)
    _, _, centers = cv2.kmeans(data, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    centers[centers.sum(1).argmin()] = OUTLINE_BGR       # darkest cluster = ink outline
    H, W = up.shape[:2]; flat = cl.reshape(-1, 3).astype(np.float32)
    lab = np.stack([((flat - c) ** 2).sum(1) for c in centers], 1).argmin(1).reshape(H, W)
    best = np.full((H, W), -1.0, np.float32); out = np.zeros((H, W), np.int32)
    for i in range(k):
        m = cv2.GaussianBlur((lab == i).astype(np.float32), (0, 0), sigma * scale / 4)
        u = m > best; best[u] = m[u]; out[u] = i
    rgb = centers[out].astype(np.uint8)
    bgra = np.dstack([rgb, a])
    ys, xs = np.where(a > 8)
    return bgra[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def main(sheet, regions, outdir):
    os.makedirs(outdir, exist_ok=True)
    im = cv2.imread(sheet); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); done = []
    for r in json.load(open(regions)):
        x, y, w, h = r["box"]; sub = g[y:y + h, x:x + w]
        m = (sub < 240).astype(np.uint8) * 255
        m = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)), np.ones((r.get("grow", 5),) * 2, np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        parts = sorted([s[:4] for s in st[1:] if s[4] >= r.get("min_area", 3000)], key=lambda b: b[0])
        for i, (px, py, pw, ph) in enumerate(parts):
            cell = im[max(0, y + py - 3):y + py + ph + 3, max(0, x + px - 3):x + px + pw + 3]
            art = retrace(cell, k=r.get("k", 6), sigma=r.get("sigma", 5.0))
            name = f"{r['prefix']}_{i}"
            cv2.imwrite(os.path.join(outdir, name + ".png"), art); done.append((name, art))
    # contact sheet
    cw, ch = 220, 260; cols = 6; rows = (len(done) + cols - 1) // cols
    sheet_img = np.full((rows * ch, cols * cw, 3), (166, 191, 205), np.uint8)
    for i, (n, art) in enumerate(done):
        s = min((cw - 10) / art.shape[1], (ch - 30) / art.shape[0]); t = cv2.resize(art, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        r_, c_ = divmod(i, cols); y0, x0 = r_ * ch + 24, c_ * cw + 5
        al = t[:, :, 3:4] / 255.0; reg = sheet_img[y0:y0 + t.shape[0], x0:x0 + t.shape[1]]
        sheet_img[y0:y0 + t.shape[0], x0:x0 + t.shape[1]] = (t[:, :, :3] * al + reg * (1 - al)).astype(np.uint8)
        cv2.putText(sheet_img, n, (c_ * cw + 5, r_ * ch + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (30, 30, 200), 1)
    cv2.imwrite(os.path.join(outdir, "_contact.png"), sheet_img); print(len(done), "parts")


if __name__ == "__main__":
    main(*sys.argv[1:4])
