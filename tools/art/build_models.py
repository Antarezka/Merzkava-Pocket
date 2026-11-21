"""Build zone-recolourable full-body models (per view) from the reference sheets.  usage: build_models.py outdir [set ...]"""
import os, sys, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model_trace import trace_model, write_packed, preview
A = "/mnt/user-data/attachments/5cee2730-b7b2-5389-823a-04cb745c5f53/"
# view key -> (box, strip_face, mirror_override or None).  keys: S N E SE (NE built from N at runtime) ; extra keys allowed (S2, N2 ...)
def L(xl, xr, y, w, mx=0, my=0, facing="front", single=False, h=None):  # all in fractions of the source crop (cell)
    return {"xl": xl, "xr": xr, "y": y, "w": w, "mx": mx, "my": my, "facing": facing, "single": single, "h": h}
SIDE_FROM = {"miko_blue": "miko_white", "burgundy": "ronin_grey", "ronin_black": "ronin_grey"}   # sets without a real side view borrow one (recoloured)
MODELS = {
    "ronin_grey": ("29d2bb74-image.jpg", {"S": ((28, 308, 108, 193), L(.325, .655, .335, .14, .49, .41)), "E": ((175, 308, 103, 193), L(.255, 0, .335, .12, 0, 0, "left", True, .09)), "N": ((315, 307, 106, 193), None),
        "SW": ((622, 308, 104, 193), L(.515, .825, .335, .115, .67, .41, "left")), "N2": ((764, 307, 109, 193), None)}),
    "miko_white": ("2e0c9408-image.jpg", {"S": ((611, 88, 143, 222), L(.417, .60, .222, .085, .509, .279)), "N": ((239, 78, 148, 221), None), "E": ((433, 84, 143, 214), L(.635, 0, .225, .08, 0, 0, "right", True, .06))}),
    "burgundy": ("e054e2b2-image.jpg", {"S": ((38, 81, 123, 171), L(.427, .633, .29, .11, .523, .365)), "N": ((198, 81, 94, 170), None), "N2": ((339, 81, 94, 170), None)}),
    "miko_blue": ("522a5fda-image.jpg", {"S": ((38, 85, 99, 169), L(.545, .75, .292, .085, .635, .362)), "SE": ((189, 84, 99, 170), L(.575, .745, .29, .075, .635, .365, "right")), "N": ((332, 84, 100, 169), None)}),
    "ronin_black": ("d359277d-image.jpg", {"S": ((694, 26, 117, 225), L(.32, .655, .30, .12, .498, .382)), "SW": ((280, 26, 150, 226), L(.24, .445, .30, .075, .335, .38, "left")),
        "N": ((37, 26, 157, 226), None)}),
}
WHITE_HAIR = {"miko_white", "burgundy", "ronin_black"}
def main(out, only):
    os.makedirs(out, exist_ok=True); SP = "/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad"
    for name, (sheet, views) in MODELS.items():
        if only and name not in only: continue
        im = cv2.imread(A + sheet); d = os.path.join(out, name); os.makedirs(d, exist_ok=True); meta = {"set": name, "views": {}, "base": {}, "sideFrom": SIDE_FROM.get(name)}; tiles = []
        for v, ((x, y, w, h), lay) in views.items():
            cell = im[y:y + h, x:x + w]
            try: idx, a, zone, levels, base, face, facing = trace_model(cell, name, layout=lay, near_white=248 if name in WHITE_HAIR else 225, chroma=8 if name in WHITE_HAIR else 18)
            except Exception as e: print("skip", name, v, e); continue
            write_packed(os.path.join(d, v + ".png"), idx, a, zone)
            meta["views"][v] = {"file": v + ".png", "w": int(idx.shape[1]), "h": int(idx.shape[0]), "levels": {str(k): lv for k, lv in levels.items()}, "face": face, "facing": facing}
            if v == "S" or not meta["base"]: meta["base"] = {str(k): c for k, c in base.items()}
            pv = preview(idx, a, zone, levels, {z: c for z, c in base.items()}); tiles.append(pv)
        json.dump(meta, open(os.path.join(d, "model.json"), "w"), indent=1)
        Hh = 330; row = []
        for t in tiles:
            s = Hh / t.shape[0]; t2 = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA); bg = np.full((Hh, t2.shape[1], 3), (160, 190, 205), np.uint8); al = t2[..., 3:4] / 255.0
            row.append(np.hstack([(t2[..., :3] * al + bg * (1 - al)).astype(np.uint8), np.full((Hh, 4, 3), 255, np.uint8)]))
        cv2.imwrite(os.path.join(SP, "model_%s.png" % name), np.hstack(row)); print(name, list(meta["views"]), {v: m["facing"] for v, m in meta["views"].items()})
if __name__ == "__main__": main(sys.argv[1], sys.argv[2:])
