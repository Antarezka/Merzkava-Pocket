"""Bare chibi base: skeleton, pose (idle / walk), body shapes, and the separate FACE layer (7 expressions).

No hair, no clothing: it wears a plain neutral under-layer only. Everything else (hair parts, outfits,
hats, tails) is a separate layer built on the same skeleton and camera (see manifest v3).
"""
import numpy as np
from engine import *

DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
YAW = {"s": 0, "se": 45, "e": 90, "ne": 135, "n": 180, "nw": 225, "w": 270, "sw": 315}
PITCH = 18.0

SKIN = Mat(auto_ramp((246, 204, 170)), (96, 54, 62))
INNER = Mat(auto_ramp((226, 222, 236)), (78, 66, 96))

# ---------------------------------------------------------------- proportions (world units ~ px)
HIP_X, LEG_UP, LEG_LO, FOOT_H = 5.6, 9.5, 8.5, 3.2
PELVIS_Y0 = LEG_UP + LEG_LO + FOOT_H        # standing hip height (24.2)
SHOULDER_X, SHOULDER_DY = 12.8, 16.6        # shoulder above hip
ARM_UP, ARM_LO = 8.4, 7.8
NECK_DY, HEAD_DY = 19.4, 19.0                # neck base above hip, head centre above neck base
HEAD_R = (24.5, 20.5, 22.5)

def v3(*a): return np.array(a, float)

def pose(move, phase):
    """joint angles in degrees. phase in [0,1)."""
    p = 2 * np.pi * phase
    if move == "walk":
        s = np.sin(p)
        return dict(thigh=(30 * s, -30 * s), knee=(38 * max(0, np.cos(p)), 38 * max(0, -np.cos(p))),
                    arm=(-24 * s, 24 * s), elbow=(14 + 12 * max(0, -np.cos(p)), 14 + 12 * max(0, np.cos(p))),
                    lean=4.0, twist=4.0 * s, bob=0.0, head_nod=1.5 * np.cos(2 * p), breathe=0.0, sway=s)
    b = np.sin(p)
    return dict(thigh=(0, 0), knee=(0, 0), arm=(2.0 * b, -2.0 * b), elbow=(10, 10), lean=0, twist=0.0,
                bob=0.0, head_nod=0.0, breathe=b, sway=b)

def leg_chain(side, ang_thigh, ang_knee, hip):
    """returns hip, knee, ankle, toe positions for one leg (angles forward = +z)."""
    a1 = deg(ang_thigh); a2 = deg(ang_thigh - ang_knee)
    hipp = hip + v3(side * HIP_X, 0, 0)
    knee = hipp + v3(0, -LEG_UP * np.cos(a1), LEG_UP * np.sin(a1))
    ankle = knee + v3(0, -LEG_LO * np.cos(a2), LEG_LO * np.sin(a2))
    return hipp, knee, ankle, a2

def arm_chain(side, ang, elbow, sh):
    a1 = deg(ang); a2 = deg(ang + elbow)
    shp = sh + v3(side * SHOULDER_X, 0, 0)
    el = shp + v3(side * 1.6, -ARM_UP * np.cos(a1), ARM_UP * np.sin(a1))
    wr = el + v3(side * 0.8, -ARM_LO * np.cos(a2), ARM_LO * np.sin(a2))
    return shp, el, wr

class Skeleton:
    """world-space joints for one frame (character space, feet near y=0)."""
    def __init__(self, move, phase, head_turn=0.0):
        P = pose(move, phase); self.P = P
        root = v3(0, 0, 0)
        # ground the lowest foot at y = 0
        legs = []
        for side, i in ((-1, 0), (1, 1)):
            legs.append(leg_chain(side, P["thigh"][i], P["knee"][i], v3(0, PELVIS_Y0, 0)))
        low = min(l[2][1] - FOOT_H * 0.9 for l in legs)
        y0 = PELVIS_Y0 - low + P["breathe"] * 0.35
        self.hip = v3(0, y0, 0)
        lean = deg(P["lean"])
        self.legs = []
        for side, i in ((-1, 0), (1, 1)):
            hp, kn, an, a2 = leg_chain(side, P["thigh"][i], P["knee"][i], self.hip)
            self.legs.append((hp, kn, an, a2))
        self.torso_R = rot_y(deg(P["twist"])) @ rot_x(lean)
        sh0 = self.hip + self.torso_R @ v3(0, SHOULDER_DY, 0)
        self.chest = self.hip + self.torso_R @ v3(0, 10.5 + P["breathe"] * 0.3, 0.4)
        self.arms = []
        for side, i in ((-1, 0), (1, 1)):
            off = self.torso_R @ v3(side * SHOULDER_X, 0, 0)
            sp = sh0 + off
            ang = P["arm"][i]; a1 = deg(ang); a2 = deg(ang + P["elbow"][i])
            el = sp + v3(side * 1.6, -ARM_UP * np.cos(a1), ARM_UP * np.sin(a1))
            wr = el + v3(side * 0.8, -ARM_LO * np.cos(a2), ARM_LO * np.sin(a2))
            self.arms.append((sp, el, wr))
        self.neck = self.hip + self.torso_R @ v3(0, NECK_DY, 0.6)
        self.head_R = rot_y(deg(-P["twist"] * 0.8 + head_turn)) @ rot_x(deg(P["head_nod"]))
        self.head = self.neck + v3(0, HEAD_DY + P["breathe"] * 0.25, 0.8)
        self.sh0 = sh0

# ---------------------------------------------------------------- body prims
def body_prims(sk):
    L = []
    P = sk.P
    # legs, feet, shorts-length under-layer
    for (hp, kn, an, a2), side in zip(sk.legs, (-1, 1)):
        oid = "leg_l" if side < 0 else "leg_r"
        L += limb(hp, kn, 5.2, 4.5, SKIN, oid)
        L.append(ell(kn, (4.5, 4.5, 4.5), SKIN, oid))
        L += limb(kn, an, 4.5, 3.6, SKIN, oid)
        foot_R = rot_x(deg(-0.35 * np.degrees(a2) * 0.0 + 0))
        fa = deg(np.degrees(a2) * 0.5)
        L.append(ell(an + v3(0, -1.2, 2.4), (4.9, 3.3, 7.6), SKIN, oid, R=rot_x(-fa * 0.6)))
        L.append(ell(hp + v3(0, -1.5, 0), (6.0, 5.6, 6.0), INNER, "inner_" + oid))          # hip joint under shorts
        L += limb(hp + v3(0, -1.0, 0), hp + (kn - hp) * 0.32, 5.7, 5.3, INNER, "inner_" + oid)
    # pelvis + under shorts
    L.append(ell(sk.hip + v3(0, 3.5, 0), (11.8, 6.4, 8.6), INNER, "pelvis"))
    # torso (skin) with an under-layer band top
    L.append(ell(sk.chest, (12.0, 9.8, 8.8), SKIN, "torso", R=sk.torso_R))
    L.append(ell(sk.chest + sk.torso_R @ v3(0, 1.2, 0.2), (12.3, 7.6, 9.1), INNER, "inner_top", R=sk.torso_R))
    # neck
    L.append(ell(sk.neck + v3(0, 1.0, 0), (5.0, 4.4, 4.6), SKIN, "neck"))
    # arms
    for (sp, el, wr), side in zip(sk.arms, (-1, 1)):
        oid = "arm_l" if side < 0 else "arm_r"
        L.append(ell(sp, (5.2, 5.2, 5.2), SKIN, oid))
        L += limb(sp, el, 4.4, 3.8, SKIN, oid)
        L.append(ell(el, (3.9, 3.9, 3.9), SKIN, oid))
        L += limb(el, wr, 3.8, 3.3, SKIN, oid)
        L.append(ell(wr + v3(0, -2.2, 0.4), (4.0, 4.4, 4.0), SKIN, "hand_l" if side < 0 else "hand_r"))
    # head: skull + rounder cheeks/jaw, small ears
    Hc, HR = sk.head, sk.head_R
    L.append(ell(Hc, HEAD_R, SKIN, "head", R=HR, keepq=True))
    L.append(ell(Hc + HR @ v3(0, -7.6, 1.4), (21.5, 13.6, 20.8), SKIN, "head", R=HR, keepq=True))
    for side in (-1, 1):
        L.append(ell(Hc + HR @ v3(side * 23.8, -2.0, -1.5), (2.4, 4.6, 3.2), SKIN, "ear", R=HR))
    return L

# ---------------------------------------------------------------- face layer (separate from the body)
EXPRESSIONS = ["neutral", "happy", "angry", "sad", "surprised", "sleepy", "blink"]
IRIS = [(58, 34, 40), (122, 66, 52), (214, 140, 84), (250, 200, 130)]      # dark top -> light bottom
LASH = (66, 36, 44); BROW = (86, 56, 56); MOUTH = (150, 62, 70); TONGUE = (226, 112, 118); BLUSH = (255, 150, 150)
SCLERA = (255, 247, 240); HILITE = (255, 255, 255)

def face_layer(res, head_cv, head_Rv, expr):
    """RGBA 96x128 holding only eyes, brows, mouth and blush, projected on the head surface."""
    out = np.zeros((CH, CW, 4), np.uint8)
    prims = res["prims"]; pid = res["pid"]
    ishead = np.array([p.keepq for p in prims] + [False])[pid] & res["alpha"]
    ys, xs = np.nonzero(ishead)
    if len(ys) == 0: return out
    hit = res["P3"][ys, xs]
    lp = (hit - head_cv) @ head_Rv                 # head-local units: x right, y up, z forward
    x, y, z = lp[:, 0], lp[:, 1], lp[:, 2]
    front = z > 3.0
    col = np.zeros((len(ys), 4), np.uint8)
    def paint(mask, rgb): col[mask & front, :3] = rgb; col[mask & front, 3] = 255

    ex, ey, erx, ery = 10.4, 1.0, 6.0, 7.6
    big = 1.14 if expr == "surprised" else 1.0
    for side in (-1, 1):
        u = (x - side * ex) / (erx * big); v = (y - ey) / (ery * big)
        t = -side * (x - side * ex) / erx                         # >0 toward the nose
        r2 = u * u + v * v
        eye = r2 <= 1.0
        if expr in ("happy",):
            arc = np.abs(v - (0.30 - 0.85 * u * u)) < 0.17
            paint(arc & (np.abs(u) < 1.05), LASH)
        elif expr == "blink":
            arc = np.abs(v - (-0.22 - 0.30 * u * u + 0.0)) < 0.14
            paint(arc & (np.abs(u) < 1.05), LASH)
        else:
            cut = {"angry": 0.50 - 0.62 * t, "sad": 0.46 + 0.55 * t - 0.0, "sleepy": np.full_like(t, -0.18)}.get(expr, np.full_like(t, 9.0))
            if expr == "sad": cut = 0.55 - 0.65 * (-t)
            vis = eye & (v <= cut)
            paint(vis, SCLERA)
            # iris: tall ellipse with vertical gradient, pupil, two highlights
            ir = ((u / 0.90) ** 2 + ((v + 0.05) / 0.96) ** 2) <= 1.0
            g = np.clip((v + 1.0) / 2.0, 0, 1)                    # 0 bottom .. 1 top
            irc = np.where(g[:, None] > 0.74, IRIS[0], np.where(g[:, None] > 0.50, IRIS[1], np.where(g[:, None] > 0.24, IRIS[2], IRIS[3]))).astype(np.uint8)
            psz = 0.30 if expr == "surprised" else 0.40
            pup = ((u / psz) ** 2 + ((v + 0.02) / (psz * 1.25)) ** 2) <= 1.0
            m_ir = vis & ir
            col[m_ir & front, :3] = irc[m_ir & front]; col[m_ir & front, 3] = 255
            paint(m_ir & pup, (40, 22, 32))
            paint(vis & ir & (((u + 0.34) ** 2 + (v - 0.42) ** 2) <= 0.075), HILITE)
            paint(vis & ir & (((u - 0.30) ** 2 + (v + 0.46) ** 2) <= 0.030), HILITE)
            # lash line: the upper rim (or the lid cut) + a small outer wing
            rim = (r2 > 0.70) & (r2 <= 1.30) & (v > -0.05) & (v <= cut + 0.34) if expr not in ("sleepy", "angry", "sad") else eye & (v > cut - 0.28) & (v <= cut + 0.22)
            paint(rim, LASH)
            wing = (np.abs(v - 0.62) < 0.11) & (t > -1.5) & (t < -1.0)
            if expr not in ("surprised",): paint(wing, LASH)
        # brows
        by = ey + (10.4 if expr not in ("surprised",) else 12.6)
        tilt = {"angry": -0.55, "sad": 0.55, "sleepy": 0.0, "surprised": 0.0, "happy": 0.0}.get(expr, 0.0)
        if expr == "sleepy": by = ey + 9.0
        bx = (x - side * (ex + 0.2)); sgn = -side
        line = by + tilt * (-sgn * bx) * 0.0
        cy = by + tilt * 3.2 * (t) * (-1) if False else by - tilt * 3.0 * (t) * 1.0
        curve = 0.0 if expr in ("angry", "sad", "sleepy") else -0.045 * bx * bx
        bro = (np.abs(bx) < 3.6) & (np.abs(y - (cy + curve + 0.0)) < 0.75)
        paint(bro, BROW)
    # mouth + nose + blush
    mx, my = x, y
    if expr == "happy":
        o = ((mx / 3.4) ** 2 + ((my + 9.4 - 0.9) / 2.4) ** 2 <= 1) & (my < -7.8)
        paint(o, MOUTH); paint(o & (my < -10.2) & (np.abs(mx) < 2.0), TONGUE)
    elif expr == "surprised":
        paint((mx / 1.9) ** 2 + ((my + 9.8) / 2.3) ** 2 <= 1, MOUTH)
    elif expr == "angry":
        paint((np.abs(my + 9.2 + 0.12 * mx * mx) < 0.55) & (np.abs(mx) < 3.0), MOUTH)
    elif expr == "sad":
        paint((np.abs(my + 9.6 + 0.20 * mx * mx) < 0.55) & (np.abs(mx) < 2.7), MOUTH)
    elif expr == "sleepy":
        paint((np.abs(my + 9.2) < 0.5) & (np.abs(mx) < 1.8), MOUTH)
    else:
        paint((np.abs(my + 9.4 - 0.16 * mx * mx) < 0.55) & (np.abs(mx) < 2.6), MOUTH)
    if expr not in ("angry",):
        for side in (-1, 1):
            b = (((mx - side * 16.8) / 4.4) ** 2 + ((my + 5.6) / 2.5) ** 2 <= 1) & (((xs + ys) % 2) == 0)
            paint(b, BLUSH)
    out[ys, xs] = col
    return out

def render_body(direction, move, phase, extra=()):
    sk = Skeleton(move, phase)
    prims = body_prims(sk) + list(extra)
    M = view_matrix(YAW[direction], PITCH)
    res = render(prims, M)
    # locate head view-space transform (index of the first keepq prim)
    k = next(i for i, p in enumerate(prims) if p.keepq)
    cv, Rv, _ = res["cache"][k]
    # the head frame of reference is the skull ellipsoid centre/rotation
    return sk, res, cv, Rv
