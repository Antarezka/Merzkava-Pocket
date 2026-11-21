"""Build the crisp 8-direction chibi base from the supplied mannequin reference sheets.

usage: python3 -I build_base.py <sheetA.jpg> <sheetB.jpg> <outdir>
Each direction is re-traced with a FIXED role palette so skin can be palette-swapped in game:
  outputs  dir_<D>.png      RGBA, default skin
           dir_<D>_idx.png  R = role index (0..N-1), A = same alpha
"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crisp import cutout

H_OUT, W_OUT, SCALE = 512, 384, 6
# role palette in BGR, measured from the front reference; role 0 is the ink outline
ROLES = {
    "outline": (54, 44, 59),    # plum-brown ink (softened from the reference's near-black)
    "line_soft": (76, 64, 60),
    "skin_deep": (140, 125, 121)[::-1],
    "skin_shade": (172, 180, 208),
    "skin_base": (206, 223, 246),
    "skin_light": (222, 236, 252),
}
ROLE_NAMES = list(ROLES)
# classification anchors (what to look for in the reference), BGR
ANCHORS = np.array([(10, 10, 18), (60, 64, 76), (121, 125, 140), (172, 180, 208), (206, 223, 246), (226, 238, 252)], np.float32)
OUT_RGB = np.array([(0x3b, 0x2c, 0x36), (0x6b, 0x52, 0x52), (0xc9, 0x9c, 0x94), (0xe3, 0xbb, 0xaf), (0xf6, 0xdf, 0xce), (0xfc, 0xee, 0xe2)], np.uint8)


def inner_boxes(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(g, 140, 255, cv2.THRESH_BINARY_INV)
    hz = cv2.morphologyEx(th, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1)))
    vt = cv2.morphologyEx(th, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 90)))
    grid = cv2.dilate(cv2.bitwise_or(hz, vt), np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(cv2.bitwise_not(grid), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    bx = [cv2.boundingRect(c) for c in cs]
    bx = [b for b in bx if 50 < b[2] < 330 and 100 < b[3] < 330]
    inner = [b for b in bx if not any(o != b and o[0] > b[0] and o[1] > b[1] and o[0] + o[2] < b[0] + b[2] and o[1] + o[3] < b[1] + b[3] for o in bx)]
    return sorted(inner, key=lambda b: (round(b[1] / 60), b[0]))


def trace(cell, sigma=2.0):
    cell = cell[2:-2, 2:-2]                      # drop the frame line
    cell = cv2.copyMakeBorder(cell, 8, 8, 8, 8, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg = cutout(cell)
    h, w = cell.shape[:2]; S = SCALE
    up = cv2.resize(cell, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), S * 0.5)
    a = np.clip((a.astype(np.float32) - 127) * 3.0 + 127, 0, 255).astype(np.uint8)
    cl = cv2.bilateralFilter(up, 9, 22, 6).astype(np.float32)
    flat = cl.reshape(-1, 3)
    d = np.stack([((flat - c) ** 2).sum(1) for c in ANCHORS], 1)
    lab = d.argmin(1).reshape(up.shape[:2])
    best = np.full(lab.shape, -1.0, np.float32); out = np.zeros(lab.shape, np.uint8)
    for i in range(len(ANCHORS)):
        m = cv2.GaussianBlur((lab == i).astype(np.float32), (0, 0), sigma * S / 2)
        u = m > best; best[u] = m[u]; out[u] = i
    return out, a


def cap_edges(idx, a, ring=15):
    """The reference cells clip heads and feet at the frame edge: close them with rounded, outlined caps."""
    ys, xs = np.where(a > 127)
    y0, y1 = ys.min(), ys.max()
    P = 140
    idx = cv2.copyMakeBorder(idx, P, P, 0, 0, cv2.BORDER_CONSTANT, value=0)
    a = cv2.copyMakeBorder(a, P, P, 0, 0, cv2.BORDER_CONSTANT, value=0)
    y0 += P; y1 += P
    def runs(row):
        m = (a[row] > 127).astype(np.int8); d = np.diff(np.concatenate([[0], m, [0]]))
        return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
    for edge, sign, k in ((y1, 1, 0.42), (y0, -1, 0.10)):
        row = edge - 4 * sign
        for xa, xb in runs(row):
            w = xb - xa
            if w < 40: continue
            cx, cy, rx, ry = (xa + xb) // 2, row, w / 2.0, max(20, int(w * k))
            ia = np.zeros(a.shape, np.uint8); ii = np.zeros(idx.shape, np.uint8)
            half = np.zeros(a.shape, np.uint8)
            cv2.ellipse(half, (cx, cy), (int(rx), ry), 0, 0 if sign > 0 else 180, 180 if sign > 0 else 360, 255, -1, cv2.LINE_8)
            region = half > 0
            region[:row] = region[:row] & (sign < 0) if False else region[:row]
            if sign > 0: region[:row, :] = False
            else: region[row + 1:, :] = False
            inner = np.zeros(a.shape, np.uint8)
            cv2.ellipse(inner, (cx, cy), (max(1, int(rx - ring)), max(1, ry - ring)), 0, 0 if sign > 0 else 180, 180 if sign > 0 else 360, 255, -1, cv2.LINE_8)
            if sign > 0: inner[:row, :] = 0
            else: inner[row + 1:, :] = 0
            idx[region] = 0; a[region] = 255
            idx[inner > 0] = 4
    return idx, a


def render(idx, a):
    idx, a = cap_edges(idx, a)
    ys, xs = np.where(a > 8)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    idx, a = idx[y0:y1, x0:x1], a[y0:y1, x0:x1]
    s = (H_OUT - 16) / idx.shape[0]
    nw, nh = max(1, round(idx.shape[1] * s)), H_OUT - 16
    idx = cv2.resize(idx, (nw, nh), interpolation=cv2.INTER_NEAREST)
    a = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_AREA)
    # anchor = bottom centre of the feet, bbox horizontal centre of the body
    cx = nw / 2
    canvas_i = np.zeros((H_OUT, W_OUT), np.uint8); canvas_a = np.zeros((H_OUT, W_OUT), np.uint8)
    ox = int(W_OUT / 2 - cx); oy = H_OUT - 8 - nh
    xs0, xs1 = max(0, ox), min(W_OUT, ox + nw)
    canvas_i[oy:oy + nh, xs0:xs1] = idx[:, xs0 - ox:xs1 - ox]; canvas_a[oy:oy + nh, xs0:xs1] = a[:, xs0 - ox:xs1 - ox]
    return canvas_i, canvas_a


def colorize(idx, a, palette=OUT_RGB):
    rgb = palette[idx]
    return np.dstack([rgb[:, :, 2], rgb[:, :, 1], rgb[:, :, 0], a])  # BGRA for cv2.imwrite


def main(pa, pb, outdir):
    os.makedirs(outdir, exist_ok=True)
    A, B = cv2.imread(pa), cv2.imread(pb); bA, bB = inner_boxes(A), inner_boxes(B)
    pick = lambda im, bx, i: im[bx[i][1]:bx[i][1] + bx[i][3], bx[i][0]:bx[i][0] + bx[i][2]]
    src = {  # direction -> (cell, mirror)
        "S": (pick(A, bA, 10), False), "N": (pick(A, bA, 6), False), "E": (pick(A, bA, 2), False),
        "SE": (pick(B, bB, 3), False), "NE": (pick(B, bB, 8), False),
    }
    src["W"] = (src["E"][0], True); src["SW"] = (src["SE"][0], True); src["NW"] = (src["NE"][0], True)
    manifest = {"size": [W_OUT, H_OUT], "anchor": [W_OUT // 2, H_OUT - 8], "roles": ["outline", "line_soft", "skin_deep", "skin_shade", "skin_base", "skin_light"],
                "default_palette": OUT_RGB.tolist(), "directions": {}}
    for name, (cell, mir) in src.items():
        idx, a = trace(cell); ci, ca = render(idx, a)
        if mir: ci, ca = ci[:, ::-1].copy(), ca[:, ::-1].copy()
        cv2.imwrite(os.path.join(outdir, f"dir_{name}.png"), colorize(ci, ca))
        cv2.imwrite(os.path.join(outdir, f"dir_{name}_idx.png"), np.dstack([ci, ci, ci, ca]))
        manifest["directions"][name] = {"mirror": mir}
        print(name, "ok")
    json.dump(manifest, open(os.path.join(outdir, "manifest.json"), "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
