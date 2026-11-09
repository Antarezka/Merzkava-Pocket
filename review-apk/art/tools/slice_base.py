"""Slice the user's 16x8 base sheet into 48x64 pixel-art cells (exact 3x downscale).
usage: slice_base.py SHEET OUTDIR [ncolors]"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
sheet, outdir = sys.argv[1], sys.argv[2]
NC = int(sys.argv[3]) if len(sys.argv) > 3 else 28
import os; os.makedirs(outdir, exist_ok=True)
im = Image.open(sheet).convert("RGBA"); a = np.array(im)
H, W = a.shape[:2]; cw, chh = W/16, H/8
S = 3; CW, CH = 48, 64
cells = {}
for r in range(8):
    for c in range(16):
        x0, x1 = int(round(c*cw)), int(round((c+1)*cw)); y0, y1 = r*192, (r+1)*192
        sub = a[y0:y1, x0:x1].copy()
        m = sub[..., 3] > 100
        lab, n = ndi.label(m, structure=np.ones((3, 3)))
        if n == 0: continue
        sizes = ndi.sum(m, lab, range(1, n+1))
        keep = np.zeros_like(m)
        for i, s in enumerate(sizes, 1):
            if s > 0.02*sizes.max(): keep |= lab == i   # drop separator specks, keep detached hands/limbs
        ys, xs = np.where(keep)
        top, bot = ys.min(), ys.max()
        head = keep[top:top+int((bot-top)*0.3)]
        hx = np.where(head.any(0))[0]; cx = int(np.median(hx))
        cells[(r, c)] = (sub, keep, cx, bot)
        # place: head centre -> x=24*3, feet bottom -> y=62*3+2
        win = np.zeros((CH*S, CW*S, 4), np.uint8)
        ox, oy = CW*S//2 - cx, (62*S+2) - bot
        for yy in range(sub.shape[0]):
            ty = yy+oy
            if not 0 <= ty < CH*S: continue
            for xx in np.where(keep[yy])[0]:
                tx = xx+ox
                if 0 <= tx < CW*S: win[ty, tx] = sub[yy, xx]
        np.save(f"{outdir}/raw_{r}_{c}.npy", win)
# global palette from all cells
allpx = np.concatenate([np.load(f"{outdir}/raw_{r}_{c}.npy").reshape(-1, 4) for (r, c) in cells])
allpx = allpx[allpx[:, 3] > 100][:, :3]
samp = allpx[np.random.RandomState(1).choice(len(allpx), min(400000, len(allpx)), replace=False)]
pimg = Image.fromarray(samp.reshape(-1, 1, 3).astype(np.uint8)).quantize(NC, method=Image.MEDIANCUT, dither=Image.NONE)
pal = np.array(pimg.getpalette()[:NC*3]).reshape(-1, 3)
np.save(f"{outdir}/palette.npy", pal)
def nearest(rgb):
    d = ((rgb[:, None, :].astype(int)-pal[None]) ** 2).sum(-1); return d.argmin(1)
for (r, c) in cells:
    win = np.load(f"{outdir}/raw_{r}_{c}.npy")
    blk = win.reshape(CH, S, CW, S, 4).transpose(0, 2, 1, 3, 4).reshape(CH, CW, S*S, 4)
    op = blk[..., 3] > 100
    cnt = op.sum(-1)
    out = np.zeros((CH, CW, 4), np.uint8)
    for y in range(CH):
        for x in range(CW):
            if cnt[y, x] >= 5:                      # majority opaque
                px = blk[y, x][op[y, x]][:, :3]
                idx = nearest(px); k = np.bincount(idx, minlength=len(pal)).argmax()   # modal palette colour
                out[y, x, :3] = pal[k]; out[y, x, 3] = 255
    Image.fromarray(out).save(f"{outdir}/cell_{r}_{c}.png")
print("cells", len(cells), "palette", len(pal))
