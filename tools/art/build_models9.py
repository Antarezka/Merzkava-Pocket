"""Build palette models from paired idle + walking 8-direction sheets.  usage: build_models9.py outdir cellsdir [id ...]
Writes <out>/<id>/{S..SW}.png (idle pose) + w_{S..SW}.png (walking pose), model.json, thumb.png.  Colours of the reference art are kept; zones are recoloured at runtime."""
import os, sys, json, colorsys, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model_trace import trace_model, write_packed
DIRS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
FACING = {"S": "front", "SE": "right", "E": "right", "SW": "left", "W": "left"}
IDS = ["miko_blue", "samurai", "ronin_mask", "elf", "blindfold", "maiden", "kitsune", "priestess", "hooded"]
SHRINK = 0.42
SP = "/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad"

def shrink(idx, a, zone):
    h, w = idx.shape; nh, nw = int(round(h * SHRINK)), int(round(w * SHRINK)); f = lambda m, ip: cv2.resize(m, (nw, nh), interpolation=ip)
    return f(idx, cv2.INTER_NEAREST), f(a, cv2.INTER_AREA), f(zone, cv2.INTER_NEAREST)
def head_cx(a):
    h = a.shape[0]; top = a[: max(2, int(h * 0.34))].astype(np.float32); xs = np.arange(a.shape[1])[None, :]
    s = top.sum(); return float((top * xs).sum() / s / a.shape[1]) if s > 0 else 0.5
def pal_rgba(idx, a, pal, zone=None, colors=None, base=None):
    P = np.array([[c[2], c[1], c[0]] for c in pal], np.float32)   # BGR
    out = np.zeros(idx.shape + (4,), np.uint8); m = idx > 0
    rgb = P[np.maximum(idx, 1) - 1].copy()
    if colors:
        for z, T in colors.items():
            zm = (zone == z) & m
            if not zm.any(): continue
            rgb[zm] = shift(P[idx[zm] - 1][:, ::-1], T, base[z])[:, ::-1]
    out[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8); out[~m, :3] = (54, 44, 59); out[..., 3] = a; return out
def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]
def shift(rgbs, T, B):
    """python mirror of models.js palShift for an (n,3) RGB array"""
    ht, st, lt = colorsys.rgb_to_hls(*[v / 255 for v in hexrgb(T)])[0], 0, 0
    ht, lt, st = colorsys.rgb_to_hls(*[v / 255 for v in hexrgb(T)]); hb, lb0, sb = colorsys.rgb_to_hls(*[v / 255 for v in hexrgb(B)]); lb = max(0.04, min(0.98, lb0)); out = []
    for c in rgbs:
        hc, lc, sc = colorsys.rgb_to_hls(*(c / 255))
        if sb > 0.14: h = (hc + (ht - hb)) % 1; sat = min(1, sc * (st / sb))
        else: h = ht; sat = st * (0.35 + 0.65 * min(1, lc / max(lb, 0.05)))
        lo = lt * (lc / lb) if lc <= lb else lt + (1 - lt) * min(1, (lc - lb) / (1 - lb))
        r, g, b = colorsys.hls_to_rgb(h, min(1, max(0, lo)), sat); out.append([r * 255, g * 255, b * 255])
    return np.array(out, np.float32)

def build(out, cells, name):
    d0 = os.path.join(out, name); os.makedirs(d0, exist_ok=True)
    meta = {"set": name, "views": {}, "walk": {}, "base": {}, "eight": True, "mode": "palette"}; ref = None; keep = {}
    Q = os.environ.get("QUICK"); dirs = Q.split(",") if Q else DIRS
    for tag, pre in (("", ""), ("W", "w_")) if not Q else (("", ""),):
        for d in dirs:
            cell = cv2.imread(os.path.join(cells, f"{name}{tag}_{d}.png"))
            idx, a, zone, levels, base, face, facing = trace_model(cell, name, layout=None, strip_face=False, ref=ref, near_white=232, chroma=10, palette=True, clip=False, k=28, seal=5)
            if ref is None and d == "S": ref = dict(base); meta["base"] = {str(k): c for k, c in base.items()}
            pal = trace_model.pal; idx, a, zone = shrink(idx, a, zone); write_packed(os.path.join(d0, pre + d + ".png"), idx, a, zone)
            v = {"pal": pal, "file": pre + d + ".png", "w": int(idx.shape[1]), "h": int(idx.shape[0]), "levels": {}, "face": None, "facing": FACING.get(d, "front"), "cx": round(head_cx(a), 4)}
            (meta["views"] if not tag else meta["walk"])[d] = v; keep[pre + d] = (idx, a, zone, pal)
    json.dump(meta, open(os.path.join(d0, "model.json"), "w")); base = {int(k): c for k, c in meta["base"].items()}
    idx, a, zone, pal = keep["S"]; t = pal_rgba(idx, a, pal); s = 160 / t.shape[0]; cv2.imwrite(os.path.join(d0, "thumb.png"), cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)); meta["thumb"] = "thumb.png"
    json.dump(meta, open(os.path.join(d0, "model.json"), "w"))
    TEST = {1: "#c4845c", 2: "#c0392b", 4: "#2e4a7d", 5: "#6b3fa0", 6: "#4f7f4f", 7: "#d9a441"}
    rows = []
    for variant in (None, TEST):
        for pre in ("", "w_") if not Q else ("",):
            tiles = []
            for d in dirs:
                idx, a, zone, pal = keep[pre + d]; t = pal_rgba(idx, a, pal, zone, {z: c for z, c in (variant or {}).items() if z in base}, base)
                Hh = 300; s = Hh / t.shape[0]; t = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA); bg = np.full((Hh, 190, 3), (160, 190, 205), np.uint8)
                w = min(190, t.shape[1]); x = (190 - w) // 2; tt = t[:, (t.shape[1] - w) // 2:(t.shape[1] - w) // 2 + w]; al = tt[..., 3:4] / 255.0
                bg[:, x:x + w] = (tt[..., :3] * al + bg[:, x:x + w] * (1 - al)).astype(np.uint8); tiles.append(bg)
            rows.append(np.hstack(tiles))
    cv2.imwrite(os.path.join(SP, "m9_%s.png" % name), np.vstack(rows)); print(name, "done", {z: base[z] for z in base}, flush=True)

if __name__ == "__main__":
    for n in (sys.argv[3:] or IDS): build(sys.argv[1], sys.argv[2], n)
