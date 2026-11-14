"""Cut every part of a user reference sheet into recolourable tone-index parts.

usage: python3 -I extract_set.py <sheet.jpg> <spec.json> <outdir>
spec: {"set":"miko_white","parts":[{"name":"hair_front","box":[x,y,w,h],"kind":"hair","split":2,"view":"front", "k":6}, ...]}
 - split N: split the box into N parts at the widest empty vertical gaps (left->right) and suffix _0.._N-1
Writes <name>.png (packed tone map), <outdir>/parts.json (levels, sizes, base colour, kind, view) and _contact.png.
"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tonepart import trace_tone, write_part, recolor_preview


def split_columns(im, box, n):
    x, y, w, h = box; sub = im[y:y + h, x:x + w]
    g = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY); hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
    col = ((g < 232) | (hsv[:, :, 1] > 40)).sum(0).astype(float)
    col = np.convolve(col, np.ones(5) / 5, "same")
    cuts = []
    lo = 0
    for i in range(1, n):
        target = w * i / n; win = (int(max(lo + 8, target - w * 0.22)), int(min(w - 8, target + w * 0.22)))
        c = win[0] + int(np.argmin(col[win[0]:win[1]])); cuts.append(c); lo = c
    edges = [0] + cuts + [w]
    return [(x + edges[i], y, edges[i + 1] - edges[i], h) for i in range(n)]


def main(sheet, spec_path, outdir):
    im = cv2.imread(sheet); spec = json.load(open(spec_path)); os.makedirs(outdir, exist_ok=True)
    meta = {"set": spec["set"], "parts": {}}; tiles = []
    for p in spec["parts"]:
        boxes = split_columns(im, p["box"], p["split"]) if p.get("split", 1) > 1 else [tuple(p["box"])]
        for i, (x, y, w, h) in enumerate(boxes):
            name = p["name"] + (f"_{i}" if p.get("split", 1) > 1 else "")
            if name in spec.get("skip", []): continue
            cell = im[max(0, y):y + h, max(0, x):x + w]
            try:
                idx, a, levels, base, zone = trace_tone(cell, k=p.get("k", 6), sigma=p.get("sigma", 4.0), ink_band=p.get("ink_band", 3.0), strip_face=p.get("strip_face", p.get("kind") == "hair" and p.get("view", "S") == "S"))
            except Exception as e:
                print("skip", name, e); continue
            write_part(os.path.join(outdir, name + ".png"), idx, a, zone)
            meta["parts"][name] = {"file": name + ".png", "w": int(idx.shape[1]), "h": int(idx.shape[0]), "levels": levels, "base": base,
                                   "kind": p.get("kind", "misc"), "view": p.get("view", ""), "has_skin": bool(zone.any()), "src": [int(x), int(y), int(w), int(h)]}
            tiles.append((name, recolor_preview(idx, a, levels, base, zone=zone)))
    json.dump(meta, open(os.path.join(outdir, "parts.json"), "w"), indent=1)
    cw, ch, cols = 200, 250, 7; rows = (len(tiles) + cols - 1) // cols
    sh = np.full((rows * ch, cols * cw, 3), (166, 191, 205), np.uint8)
    for i, (n, t) in enumerate(tiles):
        s = min((cw - 8) / t.shape[1], (ch - 28) / t.shape[0]); tt = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        r, c = divmod(i, cols); y0, x0 = r * ch + 22, c * cw + 4; al = tt[:, :, 3:4] / 255.0
        reg = sh[y0:y0 + tt.shape[0], x0:x0 + tt.shape[1]]; sh[y0:y0 + tt.shape[0], x0:x0 + tt.shape[1]] = (tt[:, :, :3] * al + reg * (1 - al)).astype(np.uint8)
        cv2.putText(sh, n, (c * cw + 4, r * ch + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (30, 30, 200), 1)
    cv2.imwrite(os.path.join(outdir, "_contact.png"), sh); print(len(tiles), "parts ->", outdir)


if __name__ == "__main__":
    main(*sys.argv[1:4])
