"""Build zone-recolourable full-body models (per view) from the reference sheets.  usage: build_models.py outdir [set ...]"""
import os, sys, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model_trace import trace_model, write_packed, preview
A = "/mnt/user-data/attachments/5cee2730-b7b2-5389-823a-04cb745c5f53/"
# view key -> (box, strip_face, mirror_override or None).  keys: S N E SE (NE built from N at runtime) ; extra keys allowed (S2, N2 ...)
def L(cx, gap, y, w, mx, my, facing="front", single=False): return {"eyeCx": cx, "gap": gap, "eyeY": y, "eyeW": w, "mouthX": mx, "mouthY": my, "facing": facing, "single": single}
MODELS = {
    "ronin_grey": ("29d2bb74-image.jpg", {"S": ((28, 308, 108, 193), L(.47, .20, .335, .20, .50, .405)), "E": ((175, 308, 103, 193), L(.31, 0, .335, .17, 0, 0, "left", True)), "N": ((315, 307, 106, 193), None),
        "SW": ((622, 308, 104, 193), L(.66, .16, .335, .15, .64, .405, "left")), "SF": ((480, 308, 108, 193), L(.50, .20, .335, .20, .52, .405)), "N2": ((764, 307, 109, 193), None)}),
    "miko_white": ("2e0c9408-image.jpg", {"S": ((611, 88, 143, 222), L(.51, .105, .285, .11, .50, .345)), "N": ((239, 78, 148, 221), None), "E": ((433, 84, 143, 214), L(.78, 0, .31, .07, 0, 0, "right", True))}),
    "burgundy": ("e054e2b2-image.jpg", {"S": ((38, 81, 123, 171), L(.572, .0725, .335, .10, .58, .39)), "N": ((198, 81, 94, 170), None), "N2": ((339, 81, 94, 170), None)}),
    "miko_blue": ("522a5fda-image.jpg", {"S": ((38, 85, 99, 169), L(.52, .125, .29, .10, .52, .355)), "SE": ((189, 84, 99, 170), L(.645, .145, .29, .10, .66, .355, "right")), "N": ((332, 84, 100, 169), None)}),
    "ronin_black": ("d359277d-image.jpg", {"S": ((694, 26, 117, 225), L(.49, .157, .315, .13, .485, .375)), "SW": ((280, 26, 150, 226), L(.36, .11, .31, .11, .365, .38, "left")), "SW2": ((37, 26, 157, 226), L(.36, .11, .31, .11, .365, .38, "left")), "N": ((501, 26, 141, 225), None)}),
}
WHITE_HAIR = {"miko_white", "burgundy", "ronin_black"}
def main(out, only):
    os.makedirs(out, exist_ok=True); SP = "/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad"
    for name, (sheet, views) in MODELS.items():
        if only and name not in only: continue
        im = cv2.imread(A + sheet); d = os.path.join(out, name); os.makedirs(d, exist_ok=True); meta = {"set": name, "views": {}, "base": {}}; tiles = []
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
