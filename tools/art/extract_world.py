"""Cut every object out of a white-background pixel atlas into crisp hi-res RGBA sprites (own re-trace).
usage: extract_world.py atlas.jpg outdir [ymax] [scale]   -> outdir/obj_###.png, objects.json, _contact.png"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from crisp import cutout, crisp, tight_crop

def main(path, out, ymax=None, scale=4):
    im = cv2.imread(path); os.makedirs(out, exist_ok=True)
    if ymax: im = im[:int(ymax)]
    h, w = im.shape[:2]
    mx = im.max(2).astype(int); mn = im.min(2).astype(int)
    white = ((mx - mn) < 14) & (mn > 208)
    pad = cv2.copyMakeBorder(white.astype(np.uint8), 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=1); m = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(pad, m, (0, 0), 2); fg = (pad[1:-1, 1:-1] != 2).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    merged = cv2.dilate(fg, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(merged)
    boxes = sorted([tuple(st[i, :4]) for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 260], key=lambda b: (round((b[1] + b[3] / 2) / 70), b[0]))
    meta = []; tiles = []
    for i, (x, y, bw, bh) in enumerate(boxes):
        x0, y0 = max(0, x - 3), max(0, y - 3); cell = im[y0:y + bh + 3, x0:x + bw + 3]
        c = cutout(cell, near_white=200, chroma=16)
        # drop soft cast shadow: low-chroma mid-light pixels at the lower right that are not part of the main body
        up, _ = crisp(cell, c, scale=scale, k=8)
        up = tight_crop(up, pad=6)
        name = f"obj_{i:03d}.png"; cv2.imwrite(os.path.join(out, name), up)
        meta.append({"file": name, "w": int(up.shape[1]), "h": int(up.shape[0]), "src": [int(x), int(y), int(bw), int(bh)]})
        tiles.append((name, up))
    json.dump({"scale": scale, "objects": meta}, open(os.path.join(out, "objects.json"), "w"), indent=1)
    cols = 12; cw = 120; rows = (len(tiles) + cols - 1) // cols; sheet = np.full((rows * cw, cols * cw, 3), (159, 185, 203), np.uint8)
    for k, (nm, t) in enumerate(tiles):
        s = min((cw - 10) / t.shape[1], (cw - 24) / t.shape[0]); t2 = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        r, c_ = divmod(k, cols); oy, ox = r * cw + 16, c_ * cw + 5; hh, ww = t2.shape[:2]
        a = t2[..., 3:4] / 255.0; sheet[oy:oy + hh, ox:ox + ww] = (t2[..., :3] * a + sheet[oy:oy + hh, ox:ox + ww] * (1 - a)).astype(np.uint8)
        cv2.putText(sheet, str(k), (c_ * cw + 3, r * cw + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 200), 1)
    cv2.imwrite(os.path.join(out, "_contact.png"), sheet); print(len(tiles), "objects")
if __name__ == "__main__": main(sys.argv[1], sys.argv[2], *(float(a) for a in sys.argv[3:4]), *(int(a) for a in sys.argv[4:5]))
