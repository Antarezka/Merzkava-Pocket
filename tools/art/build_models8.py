"""Build the 8-direction models from the fixed references.  usage: build_models8.py outdir cellsdir [set ...]
cells come from prep8.py; eye/mouth positions from face8_snap.json (auto-snapped on the baked eyes) with hand corrections below."""
import os, sys, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model_trace import trace_model, write_packed, preview
DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
FACING = {"S": "front", "SE": "right", "E": "right", "SW": "left", "W": "left"}
SNAP = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "face8_snap.json")))
DY = {"burgundy8": {"S": 0, "SE": 0, "SW": 0, "E": 4, "W": 4}, "hoodie": {d: 2 for d in DIRS}, "nohood": {d: 3 for d in DIRS}}
MOUTH = {  # cell pixel coords measured on the reference (side views keep their baked mouth dot)
    "burgundy8": {"S": (182.5, 170), "SE": (228, 165), "SW": (161.5, 169.5)},
    "hoodie": {"S": (89.5, 128.5), "SE": (116.5, 127), "SW": (69.5, 125.5)},
    "nohood": {"S": (89.5, 133), "SE": (127.5, 134), "SW": (69, 132.5)},
}
EYES_FIX = {"nohood_SE": [None, (142, 118)], "nohood_W": [(55, 115)]}
EYE_W = {"burgundy8": 22, "hoodie": 21, "nohood": 21}
EYE_H = {"burgundy8": 22, "hoodie": 19, "nohood": 19}
WHITE = {"burgundy8", "hoodie", "nohood"}

PALETTE_SETS = {"oni", "seer", "skull"}
NOFACE = {"oni", "seer", "skull"}   # face proportions not measured yet -> original (baked) face only
def layout(name, d, cw, ch):
    if d not in FACING or name in NOFACE: return None
    s = SNAP[f"{name}_{d}"]; eyes = [list(e) for e in s["eyes"]]; dy = DY[name][d]
    fix = EYES_FIX.get(f"{name}_{d}")
    if fix:
        eyes = [(e if f is None else list(f)) for e, f in zip(eyes + [None] * len(fix), fix)] if len(fix) > len(eyes) else [list(f) for f in fix]
        if name == "nohood" and d == "SE": eyes = [[s["eyes"][0][0], s["eyes"][0][1] + dy], [142, 118]]
        elif name == "nohood" and d == "W": eyes = [[55, 115]]
    else:
        for e in eyes: e[1] += dy
    single = len(eyes) == 1; mo = MOUTH[name].get(d)
    return {"xl": eyes[0][0] / cw, "xr": 0 if single else eyes[-1][0] / cw, "y": eyes[0][1] / ch, "w": EYE_W[name] / cw, "h": EYE_H[name] / ch, "up": 2.0 / ch, "sx": 0.72,
            "mx": mo[0] / cw if mo else 0, "my": mo[1] / ch if mo else 0, "facing": FACING[d], "single": single}

SHRINK = 0.5   # traced at x5 for clean edges, stored at x2.5 (the game renders the figure ~237px tall)
def shrink(idx, a, zone):
    h, w = idx.shape; nh, nw = int(round(h * SHRINK)), int(round(w * SHRINK))
    f = lambda m, ip: cv2.resize(m, (nw, nh), interpolation=ip)
    return f(idx, cv2.INTER_NEAREST), f(a, cv2.INTER_AREA), f(zone, cv2.INTER_NEAREST)
def pal_preview(idx, a, pal):
    out = np.zeros(idx.shape + (4,), np.uint8); P = np.array([[c[2], c[1], c[0]] for c in pal], np.uint8)
    m = idx > 0; out[m, :3] = P[idx[m] - 1]; out[idx == 0, :3] = (54, 44, 59); out[..., 3] = a; return out
def main(out, cells, only):
    SP = "/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad"
    for name in ["burgundy8", "hoodie", "nohood", "oni", "seer", "skull"]:
        if only and name not in only: continue
        d0 = os.path.join(out, name); os.makedirs(d0, exist_ok=True); meta = {"set": name, "views": {}, "base": {}, "eight": True, "mode": "palette" if name in PALETTE_SETS else "tone"}; tiles = []; ref = None
        for d in DIRS:
            cell = cv2.imread(os.path.join(cells, f"{name}_{d}.png")); ch, cw = cell.shape[:2]; lay = layout(name, d, cw, ch)
            kw = dict(near_white=248, chroma=8, palette=name in PALETTE_SETS, clip=name != 'seer', k=28 if name in PALETTE_SETS else 16)
            idx, a, zone, levels, base, face, facing = trace_model(cell, name, layout=lay, strip_face=False, ref=ref, **kw)
            if d == "S": ref = dict(base)
            idx, a, zone = shrink(idx, a, zone)
            write_packed(os.path.join(d0, d + ".png"), idx, a, zone)
            pal = getattr(trace_model, "pal", None) if name in PALETTE_SETS else None
            v = {"pal": pal, "file": d + ".png", "w": int(idx.shape[1]), "h": int(idx.shape[0]), "levels": {str(k): lv for k, lv in levels.items()}, "face": None, "facing": facing}
            if lay:
                idx2, a2, zone2, levels2, base2, face2, _ = trace_model(cell, name, layout=lay, strip_face=True, ref=ref, **kw)
                idx2, a2, zone2 = shrink(idx2, a2, zone2)
                write_packed(os.path.join(d0, d + "_b.png"), idx2, a2, zone2)
                v.update({"blank": d + "_b.png", "blankLevels": {str(k): lv for k, lv in levels2.items()}, "blankW": int(idx2.shape[1]), "blankH": int(idx2.shape[0]), "face": face2})
            meta["views"][d] = v
            if d == "S": meta["base"] = {str(k): c for k, c in base.items()}
            tiles.append(preview(idx, a, zone, levels, {z: c for z, c in ref.items()}) if not pal else pal_preview(idx, a, pal))
        t = tiles[0]; s_ = 160 / t.shape[0]; t = cv2.resize(t, None, fx=s_, fy=s_, interpolation=cv2.INTER_AREA); cv2.imwrite(os.path.join(d0, "thumb.png"), t); meta["thumb"] = "thumb.png"
        json.dump(meta, open(os.path.join(d0, "model.json"), "w"), indent=1)
        Hh = 330; row = []
        for t in tiles:
            s = Hh / t.shape[0]; t2 = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA); bg = np.full((Hh, t2.shape[1], 3), (160, 190, 205), np.uint8); al = t2[..., 3:4] / 255.0
            row.append(np.hstack([(t2[..., :3] * al + bg * (1 - al)).astype(np.uint8), np.full((Hh, 4, 3), 255, np.uint8)]))
        cv2.imwrite(os.path.join(SP, "m8_%s.png" % name), np.hstack(row)); print(name, "done", {k: v["face"] and (round(v["face"]["eyeY"], 3), round(v["face"]["eyeW"], 3)) for k, v in meta["views"].items()})

if __name__ == "__main__": main(sys.argv[1], sys.argv[2], sys.argv[3:])
