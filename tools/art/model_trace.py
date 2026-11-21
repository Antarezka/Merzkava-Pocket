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

FACE = [None]
HAIR = [None]   # per-view auto-detected hair mask, filled in by trace_model for sets that use it
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
    skin2 = lambda H, S, V, Y: ((H <= 22) | (H >= 170)) & (S >= 19) & (S <= 150) & (V >= 160)
    R["hoodie"] = [("skin", skin2), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.55)), ("hakama", dark), ("hair", lambda H, S, V, Y: (V > 120) & (S < 70) & (Y < 0.42)), ("outer", lambda H, S, V, Y: (V >= 110))]
    R["nohood"] = R["hoodie"]
    R["burgundy8"] = [("skin", skin), ("outer", lambda H, S, V, Y: ((H <= 12) | (H >= 160)) & (S > 70) & (V > 30) & (V < 200)), ("collar", lambda H, S, V, Y: dark(H, S, V, Y) & (Y < 0.55)),
                      ("hair", lambda H, S, V, Y: (S < 60) & (V > 150)), ("hakama", lambda H, S, V, Y: (Y > 0.5)), ("accent", lambda H, S, V, Y: True)]
    red_b = lambda H, S, V, Y: ((H <= 9) | (H >= 168)) & (S > 150) & (V > 95)
    gold = lambda H, S, V, Y: (H >= 14) & (H <= 36) & (S > 85) & (V > 110)
    white = lambda H, S, V, Y: (S < 45) & (V > 165)
    R["oni"] = [("skin", skin), ("accent", gold), ("accent", lambda H, S, V, Y: red_b(H, S, V, Y) & (Y < 0.42)), ("hair", lambda H, S, V, Y: (Y < 0.40)), ("outer", lambda H, S, V, Y: True)]
    R["seer"] = [("skin", skin2), ("accent", gold), ("collar", lambda H, S, V, Y: (V < 95) & (Y < 0.36)), ("hair", lambda H, S, V, Y: white(H, S, V, Y) & (Y < 0.56)),
                 ("hakama", lambda H, S, V, Y: white(H, S, V, Y)), ("outer", lambda H, S, V, Y: True)]
    R["skull"] = [("skin", skin), ("hair", lambda H, S, V, Y: (Y < 0.40) & (((H <= 12) | (H >= 160)) & (S > 100) & (V > 60))), ("collar", lambda H, S, V, Y: (Y < 0.40)),
                  ("hakama", lambda H, S, V, Y: white(H, S, V, Y)), ("outer", lambda H, S, V, Y: True)]

    # ---- batch 3: paired idle + walking sheets (palette models) ----
    skin3 = lambda H, S, V, Y: ((H <= 22) | (H >= 170)) & (S >= 19) & (S <= 150) & (V >= 160)
    redc = lambda H, S, V, Y: ((H <= 12) | (H >= 165)) & (S > 85) & (V > 55)
    goldc = lambda H, S, V, Y: (H >= 14) & (H <= 36) & (S > 70) & (V > 100)
    whitec = lambda H, S, V, Y: (S < 48) & (V > 165)
    darkc = lambda H, S, V, Y: (V < 95)
    R["miko_blue"] = [("hair", lambda H, S, V, Y: (H >= 100) & (H <= 130) & (S > 70) & (Y < 0.62)), ("skin", skin), ("hakama", lambda H, S, V, Y: redc(H, S, V, Y) & (Y > 0.45)), ("accent", redc),
                      ("collar", lambda H, S, V, Y: whitec(H, S, V, Y) & (Y < 0.30)), ("outer", lambda H, S, V, Y: True)]
    R["samurai"] = [("skin", skin3), ("accent", goldc), ("accent", lambda H, S, V, Y: (H <= 25) & (S >= 40) & (V >= 25) & (V < 110) & (Y > 0.35)), ("hair", lambda H, S, V, Y: (S < 45) & (V > 120) & (Y < 0.56)),
                    ("hakama", lambda H, S, V, Y: Y >= 0.62), ("outer", lambda H, S, V, Y: True)]
    R["ronin_mask"] = [("skin", lambda H, S, V, Y: (FACE[0] | skin3(H, S, V, Y)) & (V > 140) & (Y < 0.5)), ("accent", lambda H, S, V, Y: redc(H, S, V, Y) & (Y > 0.35)), ("collar", lambda H, S, V, Y: darkc(H, S, V, Y) & (Y < 0.5)), ("hakama", darkc),
                       ("hair", lambda H, S, V, Y: HAIR[0] & (Y < 0.72)), ("outer", lambda H, S, V, Y: True)]
    skin4 = lambda H, S, V, Y: ((H <= 21) | (H >= 170)) & (S >= 34) & (S <= 150) & (V >= 170)
    gold2 = lambda H, S, V, Y: (H >= 14) & (H <= 36) & (S > 105) & (V > 110)
    autohair = lambda H, S, V, Y: HAIR[0]
    kimono = [("skin", lambda H, S, V, Y: FACE[0]), ("accent", lambda H, S, V, Y: redc(H, S, V, Y) & (Y < 0.36)), ("outer", redc), ("hakama", lambda H, S, V, Y: gold2(H, S, V, Y) & (Y >= 0.58)), ("accent", gold2),
              ("collar", lambda H, S, V, Y: darkc(H, S, V, Y) & (Y > 0.3) & (Y < 0.8)), ("hair", lambda H, S, V, Y: autohair(H, S, V, Y) & (Y < 0.76)), ("hair", lambda H, S, V, Y: (S < 40) & (V > 170) & (Y < 0.62)),
              ("hakama", lambda H, S, V, Y: (Y >= 0.76) & (V > 120)), ("outer", lambda H, S, V, Y: True)]
    R["elf"] = kimono; R["maiden"] = kimono
    R["blindfold"] = [("skin", skin3), ("accent", lambda H, S, V, Y: goldc(H, S, V, Y) | (redc(H, S, V, Y) & (V > 70))), ("hair", lambda H, S, V, Y: (V < 110) & (Y < 0.44)),
                      ("outer", lambda H, S, V, Y: (S < 55) & (V > 150)), ("hakama", lambda H, S, V, Y: True)]
    R["kitsune"] = [("skin", lambda H, S, V, Y: FACE[0]), ("hakama", lambda H, S, V, Y: redc(H, S, V, Y) & (Y > 0.45)), ("accent", lambda H, S, V, Y: redc(H, S, V, Y)),
                    ("collar", lambda H, S, V, Y: darkc(H, S, V, Y) & (Y < 0.75)), ("hair", lambda H, S, V, Y: True)]
    R["priestess"] = [("skin", lambda H, S, V, Y: FACE[0]), ("accent", lambda H, S, V, Y: ((H >= 78) & (H <= 100) & (S > 90)) | redc(H, S, V, Y)), ("hair", lambda H, S, V, Y: autohair(H, S, V, Y) & (Y < 0.62)),
                      ("hair", lambda H, S, V, Y: (S < 70) & (V >= 140) & (Y < 0.45)), ("hakama", lambda H, S, V, Y: (S < 60) & (V >= 150) & (Y >= 0.55)), ("outer", lambda H, S, V, Y: True)]
    R["hooded"] = [("skin", lambda H, S, V, Y: ((H <= 22) | (H >= 170)) & (S >= 14) & (V >= 150) & (Y < 0.55)), ("hair", lambda H, S, V, Y: (S < 45) & (V >= 105) & (Y < 0.56)),
                   ("accent", lambda H, S, V, Y: (V >= 105) & (Y >= 0.5)), ("hakama", lambda H, S, V, Y: Y >= 0.72), ("outer", lambda H, S, V, Y: True)]
    return R[name]


def trace_model(cell, set_name, scale=5, k=16, sigma=3.2, layout=None, seed=1, near_white=225, chroma=18, strip_face=True, ref=None, palette=False, clip=True, seal=0):
    ch0, cw0 = cell.shape[:2]
    cell = cv2.copyMakeBorder(cell, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    fg = cutout(cell, near_white=near_white, chroma=chroma, seal=seal)
    h, w = cell.shape[:2]
    up = cv2.resize(cell, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), scale * 0.8); a = np.clip((a.astype(np.float32) - 127) * 3.0 + 127, 0, 255).astype(np.uint8)
    cl = cv2.bilateralFilter(up, 9, 22, 6)
    dk = (cv2.cvtColor(up, cv2.COLOR_BGR2HSV)[..., 2] < 120).astype(np.uint8)
    dk = cv2.morphologyEx(dk, cv2.MORPH_CLOSE, np.ones((scale * 3 + 1,) * 2, np.uint8))
    cs, _ = cv2.findContours(dk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); sil = np.zeros_like(dk)
    for c_ in cs:
        if cv2.contourArea(c_) > 150 * scale * scale: cv2.drawContours(sil, [c_], -1, 1, -1)
    if clip and sil.sum() > 0.5 * (a > 127).sum(): a = np.where(cv2.dilate(sil, np.ones((3, 3), np.uint8)) > 0, a, 0).astype(np.uint8)
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
    HAIR[0] = np.zeros((H, W), bool); FACE[0] = np.zeros((H, W), bool)
    if set_name in ("elf", "maiden", "kitsune", "priestess", "ronin_mask"):
        # hair = the flat colours that dominate the top of the head (outside skin / ink / saturated trim), closed into one blob; the face box (not hair-coloured) is the skin zone (kept, but not offered for recolour)
        topm = (a > 127) & (Y < 0.30) & (Vv > 110) & (Ss < 70) & ~(((Hh <= 21) | (Hh >= 170)) & (Ss >= 34) & (Ss <= 150) & (Vv >= 170))
        if topm.any():
            ids, cnt = np.unique(out[topm], return_counts=True); keep = [int(i) for i, c in zip(ids, cnt) if c >= 0.04 * topm.sum()]
            hm = (np.isin(out, keep) & (a > 127)).astype(np.uint8)
            xn = np.clip((np.arange(W)[None, :] - x0) / max(1, x1 - x0), 0, 1) * np.ones((H, 1))
            FACE[0] = (np.abs(xn - 0.5) < 0.21) & (Y > 0.16) & (Y < 0.40) & (a > 127) & (hm == 0) & (Vv > 140) & (Ss <= 150)
            blob = cv2.morphologyEx(hm, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (scale * 7 + 1,) * 2))
            blob[FACE[0]] = 0
            HAIR[0] = (blob > 0) & (a > 127)
    zone = np.zeros((H, W), np.uint8); done = np.zeros((H, W), bool)
    names = {"none": 0, "skin": 1, "hair": 2, "eyes": 3, "outer": 4, "collar": 5, "hakama": 6, "accent": 7, "hair2": 2}
    for zn, fn in rules_for(set_name):
        m = np.asarray(fn(Hh, Ss, Vv, Y)) & ~done; zone[m] = names[zn]; done |= m
    zone[(zone == 0) & (a > 127)] = 4
    if layout and set_name in ("hoodie", "nohood"):
        # pale skin shares colour space with the white hair/robe -> take the skin clusters from patches known to be face (below the eyes / mouth)
        X = lambda f: int((f * cw0 + 6) * scale); Yp = lambda f: int((f * ch0 + 6) * scale)
        ex_ = [layout["xl"]] if layout.get("single") else [layout["xl"], layout["xr"]]; ey_ = layout["y"]; ew = layout["w"] * cw0
        pts = [(X(v), Yp(ey_) + int(ew * 0.55 * scale)) for v in ex_]
        if layout.get("mx"): pts.append((X(layout["mx"]), Yp(layout["my"]) - int(1.5 * scale)))
        ids = set()
        for (px, py) in pts:
            patch = out[max(0, py - 2 * scale):py + 2 * scale, max(0, px - 2 * scale):px + 2 * scale].ravel()
            u, c = np.unique(patch, return_counts=True)
            for i_, c_ in zip(u, c):
                cB, cG, cR = centers[i_]
                if c_ >= 0.12 * patch.size and cR > cB + 6: ids.add(int(i_))
        span = (abs(layout["xr"] - layout["xl"]) / 2 + layout["w"] * 1.5) * cw0 if not layout.get("single") else layout["w"] * cw0 * 2.2
        cxm = (sum(ex_) / len(ex_)) * cw0
        box = np.zeros((H, W), bool); box[Yp(ey_) - int(ew * 0.7 * scale):Yp(ey_) + int(ew * 2.0 * scale), X((cxm - span) / cw0):X((cxm + span) / cw0)] = True
        fm = box & np.isin(out, list(ids)) & (a > 127); zone[fm] = 1
    zone[a <= 127] = 0
    # thin dark lines (outlines inside the art) are fixed ink; large dark areas stay garment zones
    darkm = (Vv < 88) & (a > 127); big = cv2.morphologyEx(darkm.astype(np.uint8), cv2.MORPH_OPEN, np.ones((scale * 2 + 1,) * 2, np.uint8)) > 0
    dist = cv2.distanceTransform((a > 127).astype(np.uint8), cv2.DIST_L2, 5)
    ink = (darkm & ~big) | (darkm & (dist <= 2.4 * scale))
    # smooth the zone map (removes 1px slivers of the wrong zone along colour boundaries -> no colour fringes when a zone is recoloured)
    live = (a > 127) & ~ink; zs = np.zeros((7, H, W), np.float32)
    for zi in range(1, 8):
        mz = (live & (zone == zi)).astype(np.float32)
        if zi == 3: continue
        zs[zi - 1] = cv2.GaussianBlur(mz, (0, 0), scale * 1.3)
    newz = (zs.argmax(0) + 1).astype(np.uint8); keep = live & (zone != 3); zone[keep] = newz[keep]
    # face features: strip the baked eyes/mouth (measured layout, fractions of the figure box) so the engine draws expressions in the same spot
    strip = np.zeros((H, W), bool); face = None
    if layout:
        # layout is measured in fractions of the ORIGINAL cell crop (xl, xr, y, w, ...) -> convert to fractions of the traced figure box
        fw = x1 - x0
        cx = lambda f: ((f * cw0 + 6) * scale - x0) / fw
        cy = lambda f: ((f * ch0 + 6) * scale - y0) / fh
        single = layout.get("single", False); xs_ = [layout["xl"]] if single else [layout["xl"], layout["xr"]]
        eyeW = layout["w"] * cw0 * scale / fw; eyeH = (layout["h"] * ch0 * scale / fh) if layout.get("h") else None
        ex = [cx(v) for v in xs_]; ey = cy(layout["y"])
        up = (layout.get("up", 0) * ch0 * scale / fh); sxm = layout.get("sx", 0.62)
        for fx in ex:
            ry = int((eyeH * fh * 0.55) if eyeH else eyeW * fw * 0.5)
            cv2.ellipse(strip.view(np.uint8), (int(x0 + fx * fw), int(y0 + (ey - up) * fh)), (int(eyeW * fw * sxm), ry), 0, 0, 360, 1, -1)
        mx = my = 0
        if layout.get("mx"):
            mx, my = cx(layout["mx"]), cy(layout["my"])
            cv2.ellipse(strip.view(np.uint8), (int(x0 + mx * fw), int(y0 + my * fh)), (int(fw * 0.04), int(fh * 0.016)), 0, 0, 360, 1, -1)
        strip &= (a > 127)
        if not strip_face:                                   # keep the baked face; only mark the iris pixels as the (recolourable) eye zone
            eyewin = strip.copy(); strip = np.zeros((H, W), bool)
        face = {"eyeX": [round(v, 4) for v in ex], "eyeCx": round(sum(ex) / len(ex), 4), "gap": round((ex[-1] - ex[0]) / 2, 4), "eyeY": round(ey, 4), "eyeW": round(eyeW, 4), "eyeH": round(eyeH, 4) if eyeH else None,
                "mouthX": round(mx, 4), "mouthY": round(my, 4), "facing": layout.get("facing", "front"), "single": single}
    if layout and not strip_face:
        eyem = eyewin & (a > 127) & (Vv < 192) & (Vv > 70) & (Ss > 14) & (Hh >= 95) & (Hh <= 140) & ~ink; zone[eyem] = 3
    zone[strip] = 1; ink[strip] = False
    if palette:   # painterly multi-colour garments: keep the 16 flat colours as an indexed palette, recolour by hue shift at runtime
        idx = np.zeros((H, W), np.uint8); live = (a > 127) & ~ink; idx[live] = (out[live] + 1).astype(np.uint8)
        base = {}
        for z in range(1, 8):
            m = (zone == z) & live
            if m.sum() < 30: continue
            ids, cnt = np.unique(out[m], return_counts=True)
            if ref and z in ref: base[z] = ref[z]; continue
            c0 = centers[ids[np.argmax(cnt)]].astype(int); base[z] = "#%02x%02x%02x" % (c0[2], c0[1], c0[0])
        ty, tx = np.where(a > 8); sl = (slice(ty.min(), ty.max() + 1), slice(tx.min(), tx.max() + 1))
        trace_model.pal = [[int(c[2]), int(c[1]), int(c[0])] for c in centers]
        return idx[sl], a[sl], zone[sl], {z: [] for z in base}, base, face, (layout or {}).get("facing", "front")
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
        if ref and z in ref: Lbase = colorsys.rgb_to_hls(*[int(ref[z][j:j + 2], 16) / 255 for j in (1, 3, 5)])[1]
        lv = [{"ink": True}]
        for gi, g in enumerate(merged):
            idx[m & np.isin(out, g)] = len(lv); lv.append({"dl": round(float(np.mean([Ls[i] for i in g]) - Lbase), 3)})
        levels[z] = lv
        bc = np.mean([centers[i] for i in merged[dom]], axis=0).astype(int); base[z] = "#%02x%02x%02x" % (bc[2], bc[1], bc[0])
        if ref and z in ref: base[z] = ref[z]
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
