"""Re-trace a reference sprite into a RECOLOURABLE tone-index part.

Output PNG is opaque and packed:  R = tone index, G = alpha, B = 0.
Level table (JSON) per part:  [{"ink": true}, {"dl": -0.21}, {"dl": 0.0}, {"dl": 0.12}, ...]
  ink -> fixed plum-brown outline;  dl -> luminance delta vs the part's dominant tone.
Runtime colour of level i = HSL-lightness(chosen) + dl*gain, so any colour the player picks keeps the painted shading.
"""
import os, sys, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crisp import cutout

INK_BGR = (54, 44, 59)


def lum(bgr):
    b, g, r = [float(v) for v in bgr]
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


def trace_tone(cell, scale=5, k=6, sigma=4.0, seed=1, ink_band=3.0, near_white=228, strip_face=False, zone_mode='skin'):
    """cell: BGR crop of ONE part. returns idx(HxW uint8), alpha(HxW uint8), levels(list), base_hex"""
    cell = cv2.copyMakeBorder(cell, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg = cutout(cell, near_white=near_white, chroma=18)
    h, w = cell.shape[:2]
    up = cv2.resize(cell, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), scale * 0.8)
    a = np.clip((a.astype(np.float32) - 127) * 3.0 + 127, 0, 255).astype(np.uint8)
    cl = cv2.bilateralFilter(up, 9, 20, 6)
    inside = cv2.erode(a, np.ones((3, 3), np.uint8)) > 127
    data = cl[inside].reshape(-1, 3).astype(np.float32)
    if len(data) < 50: raise ValueError("empty part")
    if len(data) > 120000: data = data[np.random.default_rng(seed).choice(len(data), 120000, replace=False)]
    kk = min(k, max(2, len(data) // 200))
    cv2.setRNGSeed(seed)
    _, _, centers = cv2.kmeans(data, kk, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    H, W = up.shape[:2]; flat = cl.reshape(-1, 3).astype(np.float32)
    lab = np.stack([((flat - c) ** 2).sum(1) for c in centers], 1).argmin(1).reshape(H, W)
    best = np.full((H, W), -1.0, np.float32); out = np.zeros((H, W), np.int32)
    for i in range(kk):
        m = cv2.GaussianBlur((lab == i).astype(np.float32), (0, 0), sigma * scale / 4)
        u = m > best; best[u] = m[u]; out[u] = i
    area = np.array([(out[inside] == i).sum() for i in range(kk)], float)
    L = np.array([lum(c) for c in centers])
    # drop slivers: merge tiny clusters into the nearest-luminance big one
    keep = [i for i in range(kk) if area[i] > 0.012 * area.sum()]
    remap = {i: min(keep, key=lambda j: abs(L[j] - L[i])) for i in range(kk)}
    out = np.vectorize(remap.get)(out).astype(np.int32) if len(keep) < kk else out
    keep.sort(key=lambda i: L[i])                       # dark -> light
    dom = max(keep, key=lambda i: area[i] if i != keep[0] or L[keep[0]] > 0.3 else 0)
    dark_part = L[dom] < 0.30
    # ink = darkest cluster. Light parts: all of it. Dark parts: only a band along the silhouette.
    dist = cv2.distanceTransform((a > 127).astype(np.uint8), cv2.DIST_L2, 5)
    darkest = keep[0]
    idx = np.zeros((H, W), np.uint8)
    levels = [{"ink": True}]
    order = [i for i in keep]
    tone_of = {}
    for n, c in enumerate(order):
        tone_of[c] = len(levels)
        levels.append({"dl": round(float(L[c] - L[dom]), 3)})
    for c, t in tone_of.items(): idx[out == c] = t
    ink_mask = (out == darkest) & ((~dark_part) | (dist <= ink_band * scale))
    idx[ink_mask] = 0
    if not dark_part:
        levels = [levels[0]] + [lv for i, lv in enumerate(levels) if i != tone_of[darkest] and i != 0]
        # re-pack indices after removing the darkest-as-ink level
        old2new = {0: 0}; nxt = 1
        for c in order:
            if c == darkest: continue
            old2new[tone_of[c]] = nxt; nxt += 1
        lut = np.zeros(256, np.uint8)
        for o, n in old2new.items(): lut[o] = n
        lut[tone_of[darkest]] = 0
        idx = lut[idx]
    # ---- zones: 1 = skin (recoloured with the player skin tone), 0 = everything else
    hsv = cv2.cvtColor(cl, cv2.COLOR_BGR2HSV)
    skin = ((hsv[:, :, 0] <= 22) | (hsv[:, :, 0] >= 172)) & (hsv[:, :, 1] >= 22) & (hsv[:, :, 1] <= 150) & (hsv[:, :, 2] >= 165) & (a > 127)
    skin = cv2.morphologyEx(skin.astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((scale * 2 + 1,) * 2, np.uint8)) > 0
    zone = skin.astype(np.uint8); hbox = None
    if strip_face:
        S = skin.astype(np.uint8) * 255
        S = cv2.morphologyEx(S, cv2.MORPH_CLOSE, np.ones((scale * 3,) * 2, np.uint8))
        nS, labS, stS, _ = cv2.connectedComponentsWithStats(S)
        if nS > 1:
            big = 1 + int(np.argmax(stS[1:, cv2.CC_STAT_AREA])); S = ((labS == big) * 255).astype(np.uint8)
            cnts, _ = cv2.findContours(S, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            hull = np.zeros_like(S); cv2.fillPoly(hull, [cv2.convexHull(max(cnts, key=cv2.contourArea))], 255)
            inner = cv2.erode(hull, np.ones((scale * 5,) * 2, np.uint8))
            nonskin = (hull > 0) & (S == 0) & (a > 127)
            ys_, xs_ = np.where(hull > 0); hy0, hy1, hx0, hx1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
            band = np.zeros_like(S); band[int(hy0 + 0.40 * (hy1 - hy0)):hy1, hx0:hx1] = 255
            remove = (S > 0) | (skin) | (nonskin & (inner > 0) & (band > 0))
            n2, lab2, st2, _ = cv2.connectedComponentsWithStats(nonskin.astype(np.uint8))
            for i2 in range(1, n2):
                comp = lab2 == i2
                if not np.any(comp & (inner == 0)): remove |= comp
            W_ = hx1 - hx0; hbox = (int(hx0), int(hy0), int(hx1), int(hy1))
            remove[int(hy0 + 0.60 * (hy1 - hy0)):, int(hx0 + 0.10 * W_):int(hx1 - 0.10 * W_)] = True   # whatever hangs under the chin line
            remove = cv2.dilate(remove.astype(np.uint8), np.ones((scale * 2 + 1,) * 2, np.uint8)) > 0
            empty = cv2.dilate((a < 40).astype(np.uint8), np.ones((scale * 6 + 1,) * 2, np.uint8)) > 0
            dark = (cl.astype(int).sum(2) < 260)
            stray = dark & empty & (cv2.dilate(remove.astype(np.uint8), np.ones((scale * 8 + 1,) * 2, np.uint8)) > 0)
            a = a.copy(); a[remove | stray] = 0
            n3, lab3, st3, _ = cv2.connectedComponentsWithStats((a > 127).astype(np.uint8))
            if n3 > 1:
                bigA = st3[1:, cv2.CC_STAT_AREA].max()
                for i3 in range(1, n3):
                    if st3[i3, cv2.CC_STAT_AREA] < 0.012 * bigA: a[lab3 == i3] = 0
            zone[remove | stray] = 0
    base = centers[dom].astype(int)
    base_hex = "#%02x%02x%02x" % (base[2], base[1], base[0])
    ys, xs = np.where(a > 8)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    if zone_mode == 'none': zone[:] = 0
    elif zone_mode == 'hull' and hbox:
        m = np.zeros_like(zone); m[hbox[1]:hbox[3] + 1, hbox[0]:hbox[2] + 1] = 1; zone = zone * m
    if hbox: hbox = [hbox[0] - int(xs.min()), hbox[1] - int(ys.min()), hbox[2] - int(xs.min()), hbox[3] - int(ys.min())]
    return idx[sl], a[sl], levels, base_hex, zone[sl], hbox


def write_part(path, idx, alpha, zone=None):
    z = np.zeros_like(idx) if zone is None else zone.astype(np.uint8)
    cv2.imwrite(path, np.dstack([z, alpha, idx]))


def recolor_preview(idx, alpha, levels, color_hex, ink=(0x3b, 0x2c, 0x36), gain=0.95, zone=None, skin_hex="#f2cdb8"):
    """Python mirror of the runtime recolour (for previews/tests). returns BGRA."""
    import colorsys
    r, g, b = [int(color_hex[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    lut = np.zeros((256, 3), np.uint8)
    for i, lv in enumerate(levels):
        if lv.get("ink"): c = ink
        else:
            l2 = min(1, max(0, l + lv["dl"] * gain)); rr, gg, bb = colorsys.hls_to_rgb(h, l2, s); c = (int(rr * 255), int(gg * 255), int(bb * 255))
        lut[i] = c[::-1]
    out = lut[idx]
    if zone is not None and zone.any():
        r2, g2, b2 = [int(skin_hex[i:i + 2], 16) / 255 for i in (1, 3, 5)]; h2, l2_, s2 = colorsys.rgb_to_hls(r2, g2, b2)
        lut2 = lut.copy()
        for i, lv in enumerate(levels):
            if not lv.get("ink"):
                lx = min(1, max(0, l2_ + lv["dl"] * gain)); rr, gg, bb = colorsys.hls_to_rgb(h2, lx, s2); lut2[i] = (int(bb * 255), int(gg * 255), int(rr * 255))
        out = np.where((zone > 0)[..., None], lut2[idx], out)
    return np.dstack([out, alpha])
