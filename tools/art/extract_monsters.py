"""Cut the monster reference sheets into per-monster atlases (stills, idle, walk, attack, hurt, death, portrait).
Usage: python3 extract_monsters.py <attachments dir> <out dir>
Layout is detected from the navy header bands (Front / Side / Back / 3-4 / Idle / Walk / Attack / Hurt / Death), so every sheet variant works."""
import cv2, numpy as np, json, sys, os
from scipy import ndimage as ndi

SHEETS = {  # file id -> monster art keys, top to bottom
    "7858f274": ["wild_boar", "forest_wolf", "green_slime", "bandit_thug", "giant_spider", "wooden_spirit"],
    "9520b901": ["blood_boar", "iron_fang_wolf", "venomous_spider", "cave_demon", "spirit_serpent"],
    "7b1536ff": ["stone_golem", "gale_crane", "rogue_cultist", "soul_fox", "toxic_centipede"],
    "8edd902d": ["marsh_wisp_beast", "shrine_tanuki", "lotus_leech", "paper_revenant", "croc_dragon"],
    "5be8d6b6": ["wooden_spirit_b", "venomous_spider_b", "spirit_boar", "demonic_flower", "jade_serpent"],
    "d221af7f": ["cultist_disciple", "fox_spirit", "stone_golem_dark", "vampire_bat", "qilin"],
    "8ba54898": ["abyssal_slime", "dire_wolf", "shadow_bandit", "celestial_fox", "_extra"],
}
FIXED = {  # sheets whose header bands do not split cleanly: (x, width) of card, front, side, back, 3/4, idle, walk, attack, hurt, death
    "5be8d6b6": [(5, 175), (185, 78), (265, 76), (343, 75), (420, 74), (497, 194), (695, 214), (913, 231), (1147, 192), (1342, 187)],
    "d221af7f": [(6, 173), (189, 77), (268, 76), (346, 76), (424, 74), (504, 186), (694, 214), (912, 224), (1140, 194), (1337, 193)],
    "8ba54898": [(5, 172), (186, 77), (265, 76), (343, 77), (422, 77), (504, 187), (695, 208), (906, 232), (1142, 192), (1338, 192)],
}
COLS = ["card", "front", "side", "back", "q34", "idle", "walk", "attack", "hurt", "death"]
EXPECT = {"idle": 2, "walk": 3, "attack": 2, "hurt": 2, "death": 2}
ALSO = {"idle": (3,)}   # idle panels hold 2 or 3 poses depending on the sheet
UP = 3

def header_rows(bgr):
    """rows of navy header bands -> list of rows, each a list of (x, y, w, h) in column order"""
    b, g, r = [bgr[..., i].astype(int) for i in range(3)]
    navy = ((r < 95) & (g < 110) & (b > 70) & (b < 160) & (b - r > 25)).astype(np.uint8)
    rf = navy.mean(axis=1); ys = np.where(rf > 0.38)[0]; ys = ys[ys > 75]
    bands = []
    for y in ys:
        if bands and y - bands[-1][1] <= 2: bands[-1][1] = y
        else: bands.append([y, y])
    rows = []
    for y0, y1 in bands:
        if y1 - y0 < 12: continue
        cf = navy[y0 + 2:y0 + 6].mean(axis=0) > 0.6; runs = []; s = None
        for x, v in enumerate(cf):
            if v and s is None: s = x
            if not v and s is not None:
                if runs and s - runs[-1][1] < 2: runs[-1][1] = x
                else: runs.append([s, x])
                s = None
        if s is not None: runs.append([s, len(cf)])
        runs = [rn for rn in runs if rn[1] - rn[0] > 40]
        rows.append([(a, y0, c - a, y1 - y0 + 1) for a, c in runs])
    return rows

def foreground(bgr):
    """mask of everything that is not the pale panel background; holes filled so white fur / robes stay opaque"""
    h, w = bgr.shape[:2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    ring = np.concatenate([lab[:4].reshape(-1, 3), lab[-4:].reshape(-1, 3), lab[:, :4].reshape(-1, 3), lab[:, -4:].reshape(-1, 3)])
    bg = np.median(ring, axis=0); d = np.sqrt(((lab - bg) ** 2).sum(axis=2))
    fg = (d > 30).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # flood the background from the border, everything else is figure (fills white fur enclosed by the outline)
    pad = cv2.copyMakeBorder(1 - fg, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=1); m = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(pad, m, (0, 0), 2); fg = (pad[1:-1, 1:-1] != 2).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    fg = cv2.erode(fg, np.ones((3, 3), np.uint8))
    n, lab_, st, _ = cv2.connectedComponentsWithStats(fg)
    for i in range(1, n):   # panel border lines: wide, very flat components
        if st[i, cv2.CC_STAT_HEIGHT] <= 4 and st[i, cv2.CC_STAT_WIDTH] >= 12: fg[lab_ == i] = 0
    cs = fg.sum(axis=0)   # full-height thin vertical lines (panel dividers)
    for x in np.where(cs >= 0.7 * h)[0]:
        if cs[max(0, x - 4):x - 1].max(initial=0) < 0.5 * h or cs[x + 2:x + 5].max(initial=0) < 0.5 * h: fg[:, max(0, x - 1):x + 2] = 0
    n, lab_, st, _ = cv2.connectedComponentsWithStats(fg)
    keep = np.zeros_like(fg)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= 14: keep[lab_ == i] = 1
    return keep

def split_frames(fg, k, also=()):
    """split a strip mask into frames by empty column gaps; fall back to an even split when the count is off"""
    cols = fg.sum(axis=0) > 0; runs = []; s = None
    for x, v in enumerate(cols):
        if v and s is None: s = x
        if not v and s is not None: runs.append([s, x]); s = None
    if s is not None: runs.append([s, len(cols)])
    # merge runs separated by a small gap (< 5 px)
    m = []
    for r in runs:
        if m and r[0] - m[-1][1] < 5: m[-1][1] = r[1]
        else: m.append(r)
    runs = [r for r in m if fg[:, r[0]:r[1]].sum() > 40]
    if len(runs) == k or len(runs) in also: return runs
    # frames touch or overlap: cut at the emptiest column near each expected boundary
    x0 = min(r[0] for r in runs) if runs else 0; x1 = max(r[1] for r in runs) if runs else fg.shape[1]
    cs = np.convolve(fg.sum(axis=0).astype(float), np.ones(5) / 5, mode="same"); step = (x1 - x0) / k; cuts = [x0]
    for i in range(1, k):
        c = x0 + i * step; lo, hi = int(c - 0.22 * step), int(c + 0.22 * step); lo = max(lo, cuts[-1] + 8); hi = min(hi, x1 - 8)
        cuts.append(lo + int(np.argmin(cs[lo:hi])) if hi > lo else int(c))
    cuts.append(x1); return [[cuts[i], cuts[i + 1]] for i in range(k)]

def cut(bgr, fg, x0, x1):
    sub = fg[:, x0:x1]; ys = np.where(sub.sum(axis=1) > 0)[0]
    if len(ys) == 0: return None
    y0, y1 = ys[0], ys[-1] + 1; xs = np.where(sub.sum(axis=0) > 0)[0]; xa, xb = x0 + xs[0], x0 + xs[-1] + 1
    img = bgr[y0:y1, xa:xb]; m = fg[y0:y1, xa:xb] * 255
    # supersampled, feathered alpha
    img = cv2.resize(img, None, fx=UP, fy=UP, interpolation=cv2.INTER_LANCZOS4)
    m = cv2.resize(m, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC); m = cv2.GaussianBlur(m, (0, 0), 1.1)
    m = np.clip((m.astype(np.float32) - 110) * 255 / 70, 0, 255).astype(np.uint8)
    # pull edge colours inward so the pale panel does not halo
    inner = cv2.erode((m > 200).astype(np.uint8), np.ones((5, 5), np.uint8))
    if inner.sum() > 0:
        bl = cv2.inpaint(img, (1 - inner) * 255, 3, cv2.INPAINT_TELEA); img = np.where((m[..., None] < 250), bl, img)
    img = cv2.GaussianBlur(img, (0, 0), 0.6)
    return np.dstack([img, m])

def process(src, out):
    os.makedirs(out, exist_ok=True); meta = {}
    for sid, names in SHEETS.items():
        bgr = cv2.imread(os.path.join(src, sid + "-image.png"))
        rows = header_rows(bgr); st9 = next(([t for t in r if t[0] >= 190] for r in rows if len([t for t in r if t[0] >= 190]) == 9), None); tmpl = ([(5, 0, 185, 0)] + st9) if st9 else None
        if sid in FIXED: tmpl = [(x, 0, w, 0) for x, w in FIXED[sid]]
        print(sid, len(rows), "rows", "template" if tmpl else "NO TEMPLATE")
        if not tmpl: continue
        rows = [[(tx, r[0][1], tw, r[0][3]) for tx, _, tw, _ in tmpl] for r in rows]
        for ri, row in enumerate(rows):
            if ri >= len(names) or names[ri].startswith("_") or len(row) < 10: continue
            name = names[ri]; hdr_bottom = max(t[1] + t[3] for t in row)
            top = hdr_bottom + 2; nxt = rows[ri + 1][0][1] - 6 if ri + 1 < len(rows) else bgr.shape[0] - 8
            frames = {}
            for ci, key in enumerate(COLS):
                x, y, w, h = row[ci]
                if key == "card": reg = bgr[top + 22: nxt - 4, x + 4: x + w - 4]
                else: reg = bgr[top: nxt - 5, x + 6: x + w - 6]
                fg = foreground(reg)
                if key == "card":
                    c = cut(reg, fg, 0, reg.shape[1]); frames[key] = [c] if c is not None else []; continue
                k = EXPECT.get(key, 1); runs = split_frames(fg, k, ALSO.get(key, ())) if key in EXPECT else [[0, fg.shape[1]]]
                frames[key] = [c for c in (cut(reg, fg, a, b) for a, b in runs) if c is not None]
            meta[name] = pack(name, frames, out)
    json.dump(meta, open(os.path.join(out, "monsters.json"), "w"), separators=(",", ":"))
    print("done", len(meta))

def pack(name, frames, out):
    """one png per monster: frames laid out in one row each state (stacked); json holds rects + foot anchors"""
    order = ["front", "side", "back", "q34", "idle", "walk", "attack", "hurt", "death", "card"]
    PAD = 4; rows = []; info = {}
    for key in order:
        fl = frames.get(key) or []
        if fl: rows.append((key, fl))
    W = max(sum(f.shape[1] + PAD for f in fl) for _, fl in rows) + PAD; H = sum(max(f.shape[0] for f in fl) + PAD for _, fl in rows) + PAD
    atlas = np.zeros((H, W, 4), np.uint8); y = PAD
    for key, fl in rows:
        x = PAD; rh = max(f.shape[0] for f in fl); info[key] = []
        for f in fl:
            h, w = f.shape[:2]; atlas[y: y + h, x: x + w] = f
            a = f[..., 3]; xs = np.where((a > 128).any(axis=0))[0]; info[key].append([x, y, w, h, int((xs[0] + xs[-1]) / 2) if len(xs) else w // 2])
            x += w + PAD
        y += rh + PAD
    cv2.imwrite(os.path.join(out, name + ".png"), atlas, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    return {"w": W, "h": H, "f": info}

if __name__ == "__main__": process(sys.argv[1], sys.argv[2])
