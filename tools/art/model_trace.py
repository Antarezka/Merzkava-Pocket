"""Trace a FULL-BODY reference model (one view) into a zone-recolourable packed sprite.

Packed opaque PNG:  R = tone index (0 = fixed ink outline), G = alpha, B = zone id.
Zones: 1 skin, 2 hair, 3 eyes, 4 outer (jacket/robe/mantle), 5 collar (neck piece), 6 hakama (lower garment), 7 accent (sash/bow/trim)
Per zone a level list [{dl}] -> runtime colour = lightness(chosen colour) + dl*gain.
Front-ish views can have the baked face features (eyes/brows/mouth) removed (filled with skin) so the engine draws its own expression;
the measured eye/mouth layout of the reference is returned so the overlay lands exactly where the reference put them.
"""
import os, sys, json, colorsys, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crisp import cutout

ZONES = ["none", "skin", "hair", "eyes", "outer", "collar", "hakama", "accent"]
INK_BGR = (54, 44, 59)


def _hsv(arr_bgr):
    return cv2.cvtColor(arr_bgr.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.int32)


def rules_for(name):
    """list of (zone, fn(H,S,V,Y)->bool mask) in priority order. Y = 0 at the top of the figure, 1 at the feet."""
    skin = lambda H, S, V, Y: ((H <= 22) | (H >= 170)) & (S >= 22) & (S <= 150) & (V >= 150)
    red = lambda H, S, V, Y: ((H <= 12) | (H >= 168)) & (S > 85) & (V > 55)
    dark = lambda H, S, V, Y: (V < 88)
    blue_eye = lambda H, S, V, Y: (H >= 88) & (H <= 128) & (S > 40) & (Y < 0.5)
    R = {
        "ronin_grey": [("eyes", blue_eye), ("skin", skin), ("accent", lambda H, S, V, Y: red(H, S, V, Y) & (Y > 0.35)), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.5)),
                       ("hakama", dark), ("hair", lambda H, S, V, Y: (S < 55) & (V > 90) & (V < 208) & (Y < 0.62)), ("outer", lambda H, S, V, Y: (S < 70) & (V >= 120))],
        "miko_white": [("eyes", lambda H, S, V, Y: (H >= 88) & (H <= 128) & (S > 25) & (Y < 0.45)), ("skin", skin), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.55)),
                       ("hakama", dark), ("hair", lambda H, S, V, Y: (V > 120) & (S < 60) & (Y < 0.40)), ("outer", lambda H, S, V, Y: (V >= 110))],
        "burgundy": [("eyes", lambda H, S, V, Y: (((H >= 88) & (H <= 128)) | ((H <= 12) | (H >= 168)) & (S > 70)) & (Y < 0.42) & (V > 120)), ("skin", skin),
                     ("outer", lambda H, S, V, Y: ((H <= 12) | (H >= 160)) & (S > 70) & (V > 30) & (V < 200)), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.55)),
                     ("hair", lambda H, S, V, Y: (S < 60) & (V > 150)), ("hakama", lambda H, S, V, Y: (Y > 0.5)), ("accent", lambda H, S, V, Y: True)],
        "miko_blue": [("eyes", lambda H, S, V, Y: (H >= 85) & (H <= 105) & (S > 20) & (V > 150) & (Y < 0.45)), ("hair", lambda H, S, V, Y: (H >= 100) & (H <= 130) & (S > 70) & (Y < 0.5)), ("skin", skin),
                      ("hakama", lambda H, S, V, Y: red(H, S, V, Y) & (Y > 0.45)), ("accent", lambda H, S, V, Y: red(H, S, V, Y)),
                      ("collar", lambda H, S, V, Y: dark(H, S, V, Y)), ("outer", lambda H, S, V, Y: (V >= 120) & (S < 70) & (Y > 0.28)), ("hair2", lambda H, S, V, Y: True)],
        "ronin_black": [("eyes", lambda H, S, V, Y: (H >= 88) & (H <= 128) & (S > 25) & (Y < 0.45)), ("skin", skin), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.50)),
                        ("hakama", lambda H, S, V, Y: dark(H, S, V, Y) & (Y >= 0.5)), ("outer", lambda H, S, V, Y: (V < 140) & (Y >= 0.2)), ("hair", lambda H, S, V, Y: (V >= 140) & (S < 70))],
    }
    return R[name]


def trace_model(cell, set_name, scale=5, k=16, sigma=3.2, layout=None, seed=1, near_white=225, chroma=18):
    cell = cv2.copyMakeBorder(cell, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg = cutout(cell, near_white=near_white, chroma=chroma)
    h, w = cell.shape[:2]
    up = cv2.resize(cell, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), scale * 0.8); a = np.clip((a.astype(np.float32) - 127) * 3.0 + 127, 0, 255).astype(np.uint8)
    cl = cv2.bilateralFilter(up, 9, 22, 6)
    inside = cv2.erode(a, np.ones((3, 3), np.uint8)) > 127
    data = cl[inside].reshape(-1, 3).astype(np.float32)
    if len(data) > 150000: data = data[np.random.default_rng(seed).choice(len(data), 150000, replace=False)]
    cv2.setRNGSeed(seed)
    _, _, centers = cv2.kmeans(data, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    H, W = up.shape[:2]; flat = cl.reshape(-1, 3).astype(np.float32)
    lab = np.stack([((flat - c) ** 2).sum(1) for c in centers], 1).argmin(1).reshape(H, W)
    best = np.full((H, W), -1.0, np.float32); out = np.zeros((H, W), np.int32)
    for i in range(k):
        m = cv2.GaussianBlur((lab == i).astype(np.float32), (0, 0), sigma * scale / 4)
        u = m > best; best[u] = m[u]; out[u] = i
    smooth = centers[out].astype(np.uint8)                       # flat-colour image
    ys, xs = np.where(a > 127); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); fh = max(1, y1 - y0)
    Y = np.clip((np.arange(H)[:, None] - y0) / fh, 0, 1) * np.ones((1, W))
    hsv = _hsv(smooth); Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    zone = np.zeros((H, W), np.uint8); done = np.zeros((H, W), bool)
    names = {"none": 0, "skin": 1, "hair": 2, "eyes": 3, "outer": 4, "collar": 5, "hakama": 6, "accent": 7, "hair2": 2}
    for zn, fn in rules_for(set_name):
        m = np.asarray(fn(Hh, Ss, Vv, Y)) & ~done; zone[m] = names[zn]; done |= m
    zone[(zone == 0) & (a > 127)] = 4
    zone[a <= 127] = 0
    # thin dark lines (outlines inside the art) are fixed ink; large dark areas stay garment zones
    darkm = (Vv < 88) & (a > 127); big = cv2.morphologyEx(darkm.astype(np.uint8), cv2.MORPH_OPEN, np.ones((scale * 2 + 1,) * 2, np.uint8)) > 0
    dist = cv2.distanceTransform((a > 127).astype(np.uint8), cv2.DIST_L2, 5)
    ink = (darkm & ~big) | (darkm & (dist <= 2.4 * scale))
    # face features: strip the baked eyes/mouth (measured layout, fractions of the figure box) so the engine draws expressions in the same spot
    strip = np.zeros((H, W), bool); face = None
    if layout:
        fw = x1 - x0; ex = [layout["eyeCx"] - layout["gap"], layout["eyeCx"] + layout["gap"]] if not layout.get("single") else [layout["eyeCx"]]
        for fx in ex:
            cv2.ellipse(strip.view(np.uint8), (int(x0 + fx * fw), int(y0 + layout["eyeY"] * fh)), (int(layout["eyeW"] * fw * 0.58), int(layout["eyeW"] * fw * 0.40)), 0, 0, 360, 1, -1)
        if layout.get("mouthY"): cv2.ellipse(strip.view(np.uint8), (int(x0 + layout["mouthX"] * fw), int(y0 + layout["mouthY"] * fh)), (int(fw * 0.045), int(fh * 0.016)), 0, 0, 360, 1, -1)
        strip &= (a > 127); face = dict(layout)
    zone[strip] = 1; ink[strip] = False
    # ---- tone levels per zone (lightness ranks of the flat colours that fall in the zone)
    idx = np.zeros((H, W), np.uint8); levels = {}; base = {}
    for z in range(1, 8):
        m = (zone == z) & (a > 127) & ~ink
        if not m.any(): continue
        ids, cnt = np.unique(out[m], return_counts=True)
        Ls = {int(i): colorsys.rgb_to_hls(*(centers[i][::-1] / 255.0))[1] for i in ids}
        order = sorted(ids.tolist(), key=lambda i: Ls[i]); merged = []        # merge near-equal lightness
        for i in order:
            if merged and abs(Ls[i] - Ls[merged[-1][-1]]) < 0.035: merged[-1].append(i)
            else: merged.append([i])
        while len(merged) > 6:                                                 # keep the 6 biggest groups
            gs = [sum(int(cnt[list(ids).index(i)]) for i in g) for g in merged]; j = int(np.argmin(gs)); tgt = j - 1 if j > 0 else 1; merged[tgt] += merged[j]; merged.pop(j)
        gA = [sum(int(cnt[list(ids).index(i)]) for i in g) for g in merged]; dom = int(np.argmax(gA)); Lbase = np.mean([Ls[i] for i in merged[dom]])
        lv = [{"ink": True}]
        for gi, g in enumerate(merged):
            idx[m & np.isin(out, g)] = len(lv); lv.append({"dl": round(float(np.mean([Ls[i] for i in g]) - Lbase), 3)})
        levels[z] = lv
        bc = np.mean([centers[i] for i in merged[dom]], axis=0).astype(int); base[z] = "#%02x%02x%02x" % (bc[2], bc[1], bc[0])
    if strip.any() and 1 in levels:
        sk = (zone == 1) & (a > 127) & ~ink & ~strip; ids = idx[sk]; dom = int(np.bincount(ids[ids > 0]).argmax()) if (ids > 0).any() else 1; idx[strip] = dom
    idx[ink & (a > 127)] = 0
    for z in (5, 6):  # dark garments: their own darkest tone replaces ink on the silhouette so the colour reads
        pass
    ty, tx = np.where(a > 8); sl = (slice(ty.min(), ty.max() + 1), slice(tx.min(), tx.max() + 1))
    # facing: centroid of eyes zone relative to the figure centre (>0 means looking right)
    return idx[sl], a[sl], zone[sl], levels, base, face, (layout or {}).get("facing", "front")


def write_packed(path, idx, alpha, zone):
    cv2.imwrite(path, np.dstack([zone.astype(np.uint8), alpha, idx]))          # BGR order -> R=idx, G=alpha, B=zone


def preview(idx, alpha, zone, levels, colors, gain=0.95, ink=INK_BGR):
    """python mirror of the runtime recolour -> BGRA"""
    h, w = idx.shape; out = np.zeros((h, w, 4), np.uint8)
    for z, lv in levels.items():
        hexc = colors.get(z) or "#cccccc"; r, g, b = [int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)]; hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
        lut = []
        for l in lv:
            if l.get("ink"): lut.append(ink)
            else: rr, gg, bb = colorsys.hls_to_rgb(hh, min(1, max(0, ll + l["dl"] * gain)), ss); lut.append((int(bb * 255), int(gg * 255), int(rr * 255)))
        lut = np.array(lut, np.uint8); m = zone == z; out[..., :3][m] = lut[np.minimum(idx[m], len(lut) - 1)]
    out[..., :3][idx == 0] = ink; out[..., 3] = alpha
    return out
