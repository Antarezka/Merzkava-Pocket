import sys, os, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hair_only import hair_only
P = sys.argv[1]; BASE = sys.argv[2]; OUT = sys.argv[3]
rd = lambda p: cv2.imread(p, cv2.IMREAD_UNCHANGED)

def paste(dst, src, cx, top, width):
    s = width / src.shape[1]; t = cv2.resize(src, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    x0 = int(cx - t.shape[1] / 2); y0 = int(top)
    xs, ys = max(0, x0), max(0, y0); xe, ye = min(dst.shape[1], x0 + t.shape[1]), min(dst.shape[0], y0 + t.shape[0])
    t = t[ys - y0:ye - y0, xs - x0:xe - x0]; a = t[:, :, 3:4] / 255.0
    dst[ys:ye, xs:xe, :3] = (t[:, :, :3] * a + dst[ys:ye, xs:xe, :3] * (1 - a)).astype(np.uint8)
    dst[ys:ye, xs:xe, 3] = np.maximum(dst[ys:ye, xs:xe, 3], t[:, :, 3])
    return t.shape[0]

def tint(art, shadow, base, light):
    """grey hair -> chosen colour by luminance; outline stays ink."""
    o = art.copy(); L = cv2.cvtColor(art[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    ink = art[:, :, :3].sum(2) < 230
    t = np.clip((L - 0.35) / 0.45, 0, 1)[..., None]
    lo = np.array(shadow, np.float32); mid = np.array(base, np.float32); hi = np.array(light, np.float32)
    col = np.where(t < 0.5, lo + (mid - lo) * (t * 2), mid + (hi - mid) * ((t - 0.5) * 2))
    o[:, :, :3] = np.where(ink[..., None], art[:, :, :3], col).astype(np.uint8); return o

base = rd(BASE); a = base[:, :, 3] > 127
w = a.sum(1).astype(float); H = base.shape[0]; ys = np.where(a.any(1))[0]; top, bot = ys.min(), ys.max()
ws = np.convolve(w, np.ones(9) / 9, "same"); neck = int(np.argmin(ws[int(top + 0.30 * (bot - top)):int(top + 0.60 * (bot - top))]) + top + 0.30 * (bot - top))
head_w = w[top:neck].max(); cx = base.shape[1] / 2
sh_w = w[neck + 5:neck + 60].max(); print("top", top, "neck", neck, "bot", bot, "head_w", head_w, "shoulder_w", sh_w)
crotch = int(top + 0.74 * (bot - top)); waist = int(neck + 0.58 * (crotch - neck))

def build(hair_name, hair_color, robe="robe_0", hak="hakama_0", sash="sash_0", col="collar_0"):
    c = np.zeros((H, base.shape[1], 4), np.uint8); c[:] = (0, 0, 0, 0); c = base.copy()
    hr, box = hair_only(rd(f"{P}/{hair_name}.png"), with_box=True)
    if box:
        x0_, y0_, x1_, y1_ = box; H_, W_ = hr.shape[:2]; yy, xx = np.mgrid[0:H_, 0:W_]
        behind = (yy > y1_ - 8) & (np.abs(xx - (x0_ + x1_) / 2) < 0.62 * (x1_ - x0_) / 2)
        back = hr.copy(); back[~behind, 3] = 0; hr = hr.copy(); hr[behind, 3] = 0
        back = tint(back, *hair_color); paste(c, back, cx, top - 14, head_w * 1.16)
    paste(c, rd(f"{P}/{hak}.png"), cx, waist - 8, sh_w * 1.55)
    paste(c, rd(f"{P}/{robe}.png"), cx, neck - 2, sh_w * 1.85)
    paste(c, rd(f"{P}/{sash}.png"), cx, waist - 14, sh_w * 1.05)
    paste(c, rd(f"{P}/{col}.png"), cx, neck - 16, sh_w * 0.62)
    hr = tint(hr, *hair_color)
    paste(c, hr, cx, top - 14, head_w * 1.16)
    return c

colors = {"silver": ((120, 112, 108), (190, 182, 176), (240, 236, 232)), "sakura": ((120, 100, 200), (170, 150, 240), (225, 215, 252)), "ink": ((40, 34, 44), (68, 58, 74), (120, 108, 124))}
tiles = []
for hn, cn in (("hair_messy_0", "silver"), ("hair_wavy_0", "sakura"), ("hair_short_0", "ink"), ("hair_wavy2_0", "silver")):
    t = build(hn, colors[cn]); bg = np.full(t.shape[:2] + (3,), (166, 191, 205), np.uint8); al = t[:, :, 3:4] / 255.0
    tiles.append((t[:, :, :3] * al + bg * (1 - al)).astype(np.uint8))
cv2.imwrite(OUT, cv2.resize(np.hstack(tiles), None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA))
