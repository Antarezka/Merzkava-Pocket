"""Dress the hand-drawn base: 5 outfits x 5 hairstyles x 8 directions x (idle 4 / walk 8).

Input : body strips from build_body.py  (body_<dir>_<move>.png, 48x64 cells)
Output: OUT/human_<hair>_<outfit>_<move>_<dir>.png   (strips)   + previews

Method: the user's drawing stays the body. Clothes and hair are made from it:
  * luminance-preserving recolour of the base pixels (their own shading/folds carry over)
  * extra geometry on top: robe skirt, sash, collar, cuffs, hair volume / back mass / knots
Only right-facing + front/back directions are dressed; w/sw/nw are mirrors of e/se/ne.
"""
import sys, os, json
import numpy as np
from PIL import Image

BODY, OUT = sys.argv[1], sys.argv[2]
only = sys.argv[3].split(",") if len(sys.argv) > 3 else None   # optional "hair:outfit" filter
os.makedirs(OUT, exist_ok=True)
W, H = 48, 64
LINE = (9, 5, 5)

def hx(s): s = s.lstrip("#"); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

# ramps are deep -> spec (5 tones)
OUTFITS = {
  "black_hanfu":   dict(ramp=["#05060a", "#0c0d15", "#161926", "#262c46", "#414b76"], trim="#e8dcc0", sash="#8f2f3b", hem="#c9a24a", len=8),
  "ivory_layers":  dict(ramp=["#8a7c68", "#b9ab94", "#ddd2bb", "#f1e9d6", "#fffaf0"], trim="#7da58f", sash="#c98a72", hem="#7da58f", len=8),
  "jade_scholar":  dict(ramp=["#10302a", "#1b4d40", "#2b6f5b", "#43977f", "#78c2a5"], trim="#e8e0c8", sash="#c9a24a", hem="#e8e0c8", len=8),
  "rose_ceremony": dict(ramp=["#42101f", "#6f1f34", "#9c3049", "#c4546d", "#ea8aa0"], trim="#f0d9a0", sash="#f0d9a0", hem="#c9a24a", len=8),
  "traveller_robe":dict(ramp=["#33261a", "#553f29", "#7d5b38", "#a47c50", "#c9a375"], trim="#3f7f85", sash="#3b2a1d", hem="#3f7f85", len=5),
}
HAIRS = {
  "long_black":  dict(ramp=["#04050a", "#0b0c14", "#151826", "#262c46", "#434d7a"], style="long"),
  "soft_bob":    dict(ramp=["#2a1912", "#43291c", "#63402b", "#865a3d", "#b08560"], style="bob"),
  "half_up":     dict(ramp=["#04050a", "#0d0e17", "#181b2b", "#2b3150", "#4d5985"], style="halfup"),
  "high_tie":    dict(ramp=["#2d1310", "#4b211a", "#733628", "#9b5238", "#c98059"], style="tie"),
  "long_waves":  dict(ramp=["#3b2616", "#5d3d22", "#876234", "#b58a4c", "#dcb97a"], style="waves"),
}
for o in OUTFITS.values():
    for k in ("ramp",): o[k] = [hx(c) for c in o[k]]
    for k in ("trim", "sash", "hem"): o[k] = hx(o[k])
for h in HAIRS.values(): h["ramp"] = [hx(c) for c in h["ramp"]]

def lum(rgb): return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
def tone(l, ramp):
    t = min(1.0, max(0.0, (l - 55) / (215 - 55)))
    return ramp[min(len(ramp) - 1, int(t * len(ramp) * 0.999))]

def hair_tone(l, ramp, x, y):
    """luminance tone + vertical strand streaks (one ramp step darker on every 5th column)."""
    t = min(1.0, max(0.0, (l - 55) / (215 - 55)))
    i = min(len(ramp) - 1, int(t * len(ramp) * 0.999))
    if (x * 3 + y // 4) % 5 == 0 and i > 0: i -= 1
    return ramp[i]

def put(a, x, y, c, only_empty=False):
    if 0 <= x < W and 0 <= y < H and (not only_empty or a[y, x, 3] == 0):
        a[y, x] = (*c, 255)

# ------------------------------------------------------------------ frame measurements
def measure(a):
    m = a[..., 3] > 0; ys, xs = np.where(m)
    top, bot = ys.min(), ys.max()
    widths = m.sum(1)
    lo, hi = top + 16, top + 25
    neck = lo + int(np.argmin(widths[lo:hi + 1][::-1][::1]))                  # lowest of the narrowest rows
    seg = widths[lo:hi + 1]; neck = lo + int(len(seg) - 1 - np.argmin(seg[::-1]))
    hy, hxs = np.where(m[:neck]); hc = (hxs.min() + hxs.max()) / 2
    row = m[neck + 8]; cx = float(np.where(row)[0].mean()) if row.any() else hc
    return dict(top=int(top), bot=int(bot), neck=int(neck), hc=float(hc), cx=cx,
                hl=int(hxs.min()), hr=int(hxs.max()), hip=int(neck + 20))

# ------------------------------------------------------------------ outfit
def y_off(x): return (x // 3) % 2

def paint_robe(body, me, o, dname):
    out = body.copy(); a = body
    neck, hip, cx = me["neck"], me["hip"], me["cx"]
    ramp, hemy = o["ramp"], min(hip + o["len"], me["bot"] - 5)
    m = a[..., 3] > 0
    front = dname in ("s", "se", "e")
    # --- torso + sleeves (recolour, keep outline pixels)
    for y in range(neck + 1, hip + 1):
        for x in range(W):
            if not m[y, x]: continue
            rgb = a[y, x, :3]; l = lum(rgb)
            hand = y >= hip - 5 and abs(x - cx) > 11 and dname in ("s", "n")
            if l < 48: continue                                   # outline stays
            if hand: continue                                     # bare hands
            out[y, x, :3] = tone(l, ramp)
    # --- skirt: span fill between the legs, flaring a little toward the hem
    for y in range(hip + 1, hemy + 1):
        xs = np.where(m[y])[0]
        if len(xs) == 0: continue
        flare = 1 + (y - hip) // 4
        x0, x1 = max(0, xs.min() - flare), min(W - 1, xs.max() + flare)
        k = (y - hip) / max(1, hemy - hip)
        for x in range(x0, x1 + 1):
            if m[y, x] and lum(a[y, x, :3]) >= 48: c = tone(lum(a[y, x, :3]) * 0.92, ramp)
            elif m[y, x]: c = LINE
            else:
                fold = ((x - int(cx)) % 6 == 0)
                c = ramp[1] if fold else (ramp[2] if k < 0.75 else ramp[1])
            out[y, x, :3] = c; out[y, x, 3] = 255
        # leg pixels in the skirt area get covered by the cloth, edge outline added below
    # hem trim: broken line + scalloped lower edge
    for x in range(W):
        if out[hemy, x, 3] and (x + y_off(x)) % 3 != 0: out[hemy, x, :3] = o["hem"]
        if out[hemy, x, 3] and (x % 5 == 2): out[hemy + 1, x] = (*o["hem"], 255) if hemy + 1 < H and out[hemy + 1, x, 3] == 0 else out[hemy + 1, x]
    # skirt covers up to hem; clear the original body pixels BELOW the hem except feet rows
    # --- sash
    for y in (hip - 1, hip):
        for x in range(W):
            if out[y, x, 3] and lum(out[y, x, :3]) > 40 and m[y, x]: out[y, x, :3] = o["sash"]
    # --- collar / lapels
    c0 = int(round(cx))
    if front:
        for i in range(7):
            put(out, c0 - 4 + i, neck + 1 + i, o["trim"]); put(out, c0 + 3 - (i // 2), neck + 1 + i, o["trim"]) if i < 5 else None
    else:
        for x in range(c0 - 4, c0 + 5): put(out, x, neck + 1, o["trim"])
    # --- cuffs (front/back only)
    if dname in ("s", "n"):
        for x in range(W):
            if m[hip - 5, x] and abs(x - cx) > 11 and lum(a[hip - 5, x, :3]) >= 48: out[hip - 5, x, :3] = o["trim"]
    # --- outline for new cloth outside the original silhouette
    res = out.copy()
    for y in range(H):
        for x in range(W):
            if out[y, x, 3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and out[yy, xx, 3] and not m[yy, xx]:
                        res[y, x] = (*LINE, 255); break
    return res

# ------------------------------------------------------------------ hair
def paint_hair(body, me, hair, dname):
    """returns (back_layer, front_layer, head_mask_cover) ; both HxWx4"""
    ramp = hair["ramp"]; style = hair["style"]
    a = body; m = a[..., 3] > 0
    back = np.zeros_like(a); front = np.zeros_like(a)
    top, neck, hc, hl, hr = me["top"], me["neck"], me["hc"], me["hl"], me["hr"]
    cxh = int(round(hc))
    is_back = dname in ("n", "ne")
    is_side = dname == "e"
    three4 = dname in ("se", "ne")
    face_dx = 0 if dname in ("s", "n") else 1     # right-facing -> face on +x
    head = np.zeros_like(m); head[:neck] = m[:neck]
    hh = neck - top
    # ---- cap: which head pixels become hair
    for y in range(top, neck):
        for x in range(W):
            if not head[y, x]: continue
            l = lum(a[y, x, :3])
            dy = y - top
            fx = x - hc
            if is_back: cap = True
            elif is_side:
                cap = dy <= 6 + (2 if fx > 2 else 0) or fx < -1.5
                if fx > 2 and dy > 8: cap = False
            elif three4:                                   # right-facing 3/4: back-of-head side is hair
                cap = dy <= 7 + (1 if fx > 3 else 0) - (1 if abs(fx - 2) < 2 else 0) or fx < -2.5 or (fx < 0.5 and dy <= 12)
                if style in ("long", "waves", "bob") and fx > 6.5 and dy <= 17: cap = True
            else:                                          # front: fringe with centre part + side locks
                fring = 6 if abs(fx) < 1.6 else 7 + (1 if abs(fx) > 5 else 0)
                cap = dy <= fring or (abs(fx) > 8.2 and dy <= (19 if style != "tie" else 13))
            if cap:
                if l < 48: c = ramp[0]                                 # outline -> deepest hair tone
                else: c = hair_tone(l, ramp, x, y)
                front[y, x] = (*c, 255)
    # volume: dilate the hair cap by one pixel over the head's upper outline
    vol = front[..., 3] > 0
    for y in range(max(0, top - 1), neck):
        for x in range(1, W - 1):
            if vol[y, x] or m[y, x]: continue
            if y > top + 12: continue
            if vol[y + 1, x] or (y > 0 and vol[y - 1, x]) or vol[y, x - 1] or vol[y, x + 1]:
                front[y, x] = (*ramp[0], 255)
    # fringe edge line: deepest tone on the lowest hair pixel above bare skin
    if not is_back:
        v2 = front[..., 3] > 0
        for x in range(W):
            ys = np.where(v2[:, x])[0]
            if len(ys) and ys.max() + 1 < H and m[ys.max() + 1, x] and not v2[ys.max() + 1, x] and ys.max() > top + 2:
                front[ys.max(), x] = (*ramp[1], 255)
    # ---- back mass (long styles) + accessories
    def blob(layer, x0, x1, y0, y1, edge=0, wob=0):
        n = y1 - y0 + 1
        for y in range(y0, y1 + 1):
            t = (y - y0) / max(1, n - 1)
            inset = 0 if t < 0.55 else int(round(((t - 0.55) / 0.45) ** 2 * (edge + 3)))
            for x in range(x0 + inset, x1 - inset + 1):
                if wob and t > 0.6 and ((x + y) % 5 == 0): continue
                k = (x - x0) / max(1, x1 - x0)
                l = 190 if (k < 0.3 and t < 0.5) else (110 if (k > 0.78 or t > 0.9) else 150)
                put(layer, x, y, hair_tone(l, ramp, x, y))
    ylim = {"long": neck + 15, "bob": neck + 2, "halfup": neck + 14, "tie": neck + 6, "waves": neck + 17}[style]
    half = int(hh * 0.5) + 2
    if is_back:
        # over the back: from the nape down the spine
        wd = {"long": 8, "bob": 9, "halfup": 8, "tie": 4, "waves": 10}[style]
        blob(back, cxh - wd, cxh + wd, neck - 2, ylim, edge=3, wob=1 if style == "waves" else 0)
    elif is_side:
        wd = {"long": 5, "bob": 5, "halfup": 5, "tie": 3, "waves": 6}[style]
        bx = cxh - 3
        blob(back, bx - wd, bx + 2, top + 8, ylim, edge=2, wob=1 if style == "waves" else 0)
    else:
        wd = {"long": half - 1, "bob": half - 1, "halfup": half - 1, "tie": half - 4, "waves": half + 1}[style]
        if style != "tie":
            blob(back, cxh - wd, cxh + wd, top + 10, ylim, edge=2, wob=1 if style == "waves" else 0)
    # ---- knots / tails
    if style in ("halfup", "tie"):
        if is_back or dname == "s":
            kx = cxh
        elif is_side: kx = cxh - 6
        else: kx = cxh - 4
        if style == "halfup":
            for (dx, dy) in [(-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-2, -1), (-1, -1), (0, -1), (1, -1), (2, -1), (-1, -2), (0, -2), (1, -2)]:
                put(front, kx + dx, top - 2 + dy, ramp[2] if dy < -0 else ramp[3])
            put(front, kx - 1, top - 4, ramp[0]); put(front, kx, top - 4, ramp[0])
            for dx in (-2, 3): put(front, kx + dx, top - 2, ramp[0])
        else:   # ponytail from behind the crown
            ty = top + 3
            for i in range(14):
                wob = int(round(2 * np.sin(i / 3.0)))
                wdt = 3 - i // 6
                for dx in range(-wdt + 1, wdt):
                    put(back if not is_back else front, (kx + (0 if is_back or dname == "s" else 0)) + dx + wob, ty + i, ramp[2] if dx < 1 else ramp[1])
    return back, front

# ------------------------------------------------------------------ composition
def over(base, top):
    out = base.copy(); mk = top[..., 3] > 0; out[mk] = top[mk]; return out

def dress(body, dname, hair, outfit):
    me = measure(body)
    robe = paint_robe(body, me, OUTFITS[outfit], dname)
    hb, hf = paint_hair(body, me, HAIRS[hair], dname)
    if dname in ("n", "ne"):   # back group: body, robe, hairback, hairfront
        return over(over(robe, hb), hf)
    return over(over(hb, robe), hf)    # front group: hairback, body+robe, hairfront

def frames_of(path):
    im = np.array(Image.open(path)); n = im.shape[1] // W
    return [im[:, i * W:(i + 1) * W].copy() for i in range(n)]

def write_strip(path, frames):
    s = np.zeros((H, W * len(frames), 4), np.uint8)
    for i, f in enumerate(frames): s[:, i * W:(i + 1) * W] = f
    Image.fromarray(s).save(path)

if __name__ == "__main__":
    combos = [(h, o) for h in HAIRS for o in OUTFITS if not only or f"{h}:{o}" in only]
    right = ["n", "ne", "e", "se", "s"]
    for hair, outfit in combos:
        for mv in ("idle", "walk"):
            made = {}
            for d in right:
                made[d] = [dress(f, d, hair, outfit) for f in frames_of(f"{BODY}/body_{d}_{mv}.png")]
                write_strip(f"{OUT}/human_{hair}_{outfit}_{mv}_{d}.png", made[d])
            for src, dst in (("e", "w"), ("se", "sw"), ("ne", "nw")):
                write_strip(f"{OUT}/human_{hair}_{outfit}_{mv}_{dst}.png", [f[:, ::-1].copy() for f in made[src]])
    # static 48x64 previews (direction s, idle frame 0) for the style cards
    if not only:
        for o in OUTFITS:
            Image.fromarray(frames_of(f"{OUT}/human_long_black_{o}_idle_s.png")[0]).save(f"{OUT}/human_preview_outfit_{o}.png")
        for h in HAIRS:
            Image.fromarray(frames_of(f"{OUT}/human_{h}_black_hanfu_idle_s.png")[0]).save(f"{OUT}/human_preview_hair_{h}.png")
    print("done", len(combos), "combos")
