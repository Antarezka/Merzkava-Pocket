"""Tiny cel-shaded software renderer for pixel-art characters (96x128 cells, no external engine).

Shapes are analytic ellipsoids and tapered cylinders (frustums), ray-cast orthographically and
point-sampled at pixel centres, so the result is crisp pixel art with no anti-aliasing.
Shading is a 5-tone ramp per material (hue-shifted), outlines are drawn inside the silhouette and
between parts (on the farther part), in a dark tone of the material, never pure black.

World space: x = character right, y = up, z = forward (the face looks to +z). Camera looks down -z
after yaw (heading) and pitch; screen y grows downwards. Anchor (48,124) = ground point under the feet.
"""
import numpy as np

CW, CH = 96, 128
ANCHOR = (48, 124)
SC = 1.2                       # pixels per world unit
LIGHT = np.array([-0.34, 0.52, 0.80]); LIGHT /= np.linalg.norm(LIGHT)

def rot_x(t): c, s = np.cos(t), np.sin(t); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], float)
def rot_y(t): c, s = np.cos(t), np.sin(t); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], float)
def rot_z(t): c, s = np.cos(t), np.sin(t); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)
def deg(d): return np.radians(d)

def view_matrix(yaw_deg, pitch_deg=18.0): return rot_x(deg(pitch_deg)) @ rot_y(deg(yaw_deg))

def basis_from_y(direction, hint=(0, 0, 1)):
    """rotation whose local +y axis points along `direction`."""
    y = np.asarray(direction, float); y = y / np.linalg.norm(y)
    h = np.asarray(hint, float)
    if abs(np.dot(h, y)) > 0.95: h = np.array([1.0, 0, 0])
    x = np.cross(h, y); x /= np.linalg.norm(x)
    z = np.cross(x, y)
    return np.stack([x, y, z], 1)

# ---------------------------------------------------------------- colour
def auto_ramp(base):
    """5 tones deep -> highlight: shadows drift to violet, lights to warm cream."""
    b = np.array(base, float)
    deep = b * (0.40, 0.33, 0.50); sh = b * (0.68, 0.60, 0.76)
    hi = b + (np.array((255, 243, 214)) - b) * 0.36; spec = b + (np.array((255, 250, 236)) - b) * 0.72
    return [tuple(int(v + .5) for v in np.clip(x, 0, 255)) for x in (deep, sh, b, hi, spec)]

class Mat:
    def __init__(self, ramp, line=None):
        self.ramp = np.array(ramp, np.uint8)
        self.line = np.array(line if line is not None else ramp[0], np.uint8)

class Prim:
    def __init__(self, kind, c, R, r, mat, oid, clip=None, a=1.0, b=0.0, pat=None, keepq=False, outline=True):
        self.kind, self.c, self.R, self.r = kind, np.asarray(c, float), np.asarray(R, float), np.asarray(r, float)
        self.mat, self.oid, self.clip, self.a, self.b = mat, oid, clip, a, b
        self.pat, self.keepq, self.outline = pat, keepq, outline

def ell(c, r, mat, oid, R=None, **kw): return Prim("ell", c, np.eye(3) if R is None else R, r, mat, oid, **kw)
def fru(c, r, mat, oid, R=None, a=1.0, b=0.0, **kw): return Prim("fru", c, np.eye(3) if R is None else R, r, mat, oid, a=a, b=b, **kw)

def limb(p0, p1, r0, r1, mat, oid, **kw):
    """tapered cylinder from p0 to p1 (radius r0 at p0, r1 at p1) with round joints."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    d = p1 - p0; L = np.linalg.norm(d); R = basis_from_y(d)
    mid = (p0 + p1) / 2; a = (r0 + r1) / 2; b = (r1 - r0) / 2        # radius at local y=-1 is r0, at +1 is r1
    r_xz = max(r0, r1)
    out = [fru(mid, (r_xz, L / 2, r_xz), mat, oid, R=R, a=a / r_xz, b=b / r_xz, **kw)]
    return out

# ---------------------------------------------------------------- render
def _inclip(q, clip):
    if clip is None: return np.ones(q.shape[0], bool)
    lo, hi = clip
    return np.all((q >= np.asarray(lo) - 1e-9) & (q <= np.asarray(hi) + 1e-9), axis=1)

def render(prims, M, thr=(0.27, 0.47, 0.68, 0.88)):
    ys, xs = np.mgrid[0:CH, 0:CW]
    X = (xs + 0.5 - ANCHOR[0]) / SC; Y = (ANCHOR[1] - ys - 0.5) / SC
    T = np.full((CH, CW), np.inf); PID = np.full((CH, CW), -1, int); INS = np.zeros((CH, CW), bool)
    cache = []
    for k, p in enumerate(prims):
        cv = M @ p.c; Rv = M @ p.R; r = p.r
        smax = max(abs(p.a + p.b), abs(p.a - p.b), p.a) if p.kind == "fru" else 1.0
        bound = np.linalg.norm([r[0] * smax, r[1], r[2] * smax])
        x0 = int(np.floor(ANCHOR[0] + (cv[0] - bound) * SC)); x1 = int(np.ceil(ANCHOR[0] + (cv[0] + bound) * SC)) + 1
        y0 = int(np.floor(ANCHOR[1] - (cv[1] + bound) * SC)); y1 = int(np.ceil(ANCHOR[1] - (cv[1] - bound) * SC)) + 1
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(CW, x1), min(CH, y1)
        cache.append((cv, Rv, (x0, y0, x1, y1)))
        if x1 <= x0 or y1 <= y0: continue
        o = np.stack([X[y0:y1, x0:x1], Y[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0), 500.0)], -1).reshape(-1, 3)
        o = ((o - cv) @ Rv) / r                       # R^T (o - c) / r
        d = -Rv[2, :] / r
        n = o.shape[0]
        if p.kind == "ell":
            A = float(d @ d); B = o @ d; C = (o * o).sum(1) - 1.0
            disc = B * B - A * C; ok = disc >= 0; sq = np.sqrt(np.where(ok, disc, 0))
            t1 = (-B - sq) / A; t2 = (-B + sq) / A
        else:
            a0, b0 = p.a, p.b
            s0 = a0 + b0 * o[:, 1]; sd = b0 * d[1]
            A = d[0] ** 2 + d[2] ** 2 - sd * sd
            B = o[:, 0] * d[0] + o[:, 2] * d[2] - s0 * sd
            C = o[:, 0] ** 2 + o[:, 2] ** 2 - s0 * s0
            if abs(A) < 1e-9:
                ok = np.abs(B) > 1e-9; t1 = np.where(ok, -C / (2 * np.where(ok, B, 1)), 0); t2 = t1.copy()
            else:
                disc = B * B - A * C; ok = disc >= 0; sq = np.sqrt(np.where(ok, disc, 0))
                ta = (-B - sq) / A; tb = (-B + sq) / A
                t1, t2 = np.minimum(ta, tb), np.maximum(ta, tb)
        def valid(t):
            q = o + t[:, None] * d
            v = ok & _inclip(q, p.clip)
            if p.kind == "fru": v &= (np.abs(q[:, 1]) <= 1.0) & ((p.a + p.b * q[:, 1]) > 0)
            return v
        v1, v2 = valid(t1), valid(t2)
        t = np.where(v1, t1, np.where(v2, t2, np.inf)); inside = (~v1) & v2
        t = t.reshape(y1 - y0, x1 - x0); inside = inside.reshape(y1 - y0, x1 - x0)
        sub = T[y0:y1, x0:x1]; better = t < sub
        sub[better] = t[better]; PID[y0:y1, x0:x1][better] = k; INS[y0:y1, x0:x1][better] = inside[better]
    # shading
    img = np.zeros((CH, CW, 3), np.uint8); alpha = PID >= 0
    P3 = np.zeros((CH, CW, 3)); QMAP = np.zeros((CH, CW, 3))
    for k, p in enumerate(prims):
        m = PID == k
        if not m.any(): continue
        cv, Rv, _ = cache[k]; r = p.r
        o = np.stack([X[m], Y[m], np.full(m.sum(), 500.0)], -1)
        t = T[m]
        hit = o + np.stack([np.zeros_like(t), np.zeros_like(t), -t], -1)         # view-space hit point
        ol = ((o - cv) @ Rv) / r; d = -Rv[2, :] / r
        q = ol + t[:, None] * d
        if p.kind == "ell": g = q
        else: g = np.stack([q[:, 0], -p.b * (p.a + p.b * q[:, 1]), q[:, 2]], 1)
        nrm = (g / r) @ Rv.T; nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        ins = INS[m]; nrm[ins] *= -1
        lam = np.clip(nrm @ LIGHT * 0.82 + 0.22, 0, 1)
        lam = np.where(ins, lam * 0.6, lam)
        idx = np.digitize(lam, thr)
        col = None
        if p.pat is not None:
            delta, over, omask = p.pat(q, nrm, hit)
            idx = np.clip(idx + delta, 0, len(p.mat.ramp) - 1)
            col = p.mat.ramp[idx].copy()
            if over is not None: col[omask] = over[omask]
        else: col = p.mat.ramp[idx]
        img[m] = col
        if p.keepq: P3[m] = hit; QMAP[m] = ol
    return dict(img=img, alpha=alpha, pid=PID, T=T, prims=prims, P3=P3, Q=QMAP, cache=cache)

def outline_pass(res, eps=1.6):
    img, alpha, pid, T, prims = res["img"].copy(), res["alpha"], res["pid"], res["T"], res["prims"]
    out = img.copy(); edge = np.zeros_like(alpha)
    oid = np.array([hash(p.oid) & 0x7fffffff for p in prims] + [0])[pid]
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        sa = np.zeros_like(alpha); so = np.zeros_like(oid); st = np.full_like(T, np.inf)
        ys0, ys1 = (max(0, dy), CH + min(0, dy)); xs0, xs1 = (max(0, dx), CW + min(0, dx))
        sa[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx] = alpha[ys0:ys1, xs0:xs1]
        so[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx] = oid[ys0:ys1, xs0:xs1]
        st[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx] = T[ys0:ys1, xs0:xs1]
        # pixels at the array border see "transparent" outside
        edge |= alpha & ~sa
        edge |= alpha & sa & (so != oid) & (st < T - eps)
    for k, p in enumerate(prims):
        if not p.outline: continue
        m = edge & (pid == k)
        out[m] = p.mat.line
    rgba = np.zeros((CH, CW, 4), np.uint8); rgba[..., :3] = out; rgba[..., 3] = np.where(alpha, 255, 0)
    return rgba
