"""Strip the painted face from a reference head so only the hair (and its ink outline) remains."""
import cv2, numpy as np


def skin_mask(bgra):
    b, g, r, a = [bgra[:, :, i].astype(int) for i in range(4)]
    return ((r - b) > 14) & (r > 190) & (a > 127)


def hair_only(bgra, with_box=False):
    a = bgra[:, :, 3]
    S = skin_mask(bgra).astype(np.uint8) * 255
    S = cv2.morphologyEx(S, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, _, st, _ = cv2.connectedComponentsWithStats(S)
    if n < 2:
        return (bgra, None) if with_box else bgra          # back view: no skin at all
    keep = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); lab = cv2.connectedComponents(S)[1]; S = ((lab == keep) * 255).astype(np.uint8)
    cnts, _ = cv2.findContours(S, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    hull = np.zeros_like(S); cv2.fillPoly(hull, [cv2.convexHull(max(cnts, key=cv2.contourArea))], 255)
    inner = cv2.erode(hull, np.ones((25, 25), np.uint8))
    nonskin = (hull > 0) & (S == 0) & (a > 127)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(nonskin.astype(np.uint8))
    remove = (S > 0)
    ys_, xs_ = np.where(hull > 0); hy0, hy1, hx0, hx1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
    zone = np.zeros_like(S); zone[int(hy0 + 0.40 * (hy1 - hy0)):hy1, hx0:hx1] = 255   # eye / mouth band
    remove |= nonskin & (inner > 0) & (zone > 0)
    for i in range(1, n2):
        comp = lab2 == i
        if not np.any(comp & (inner == 0)):            # fully interior: eyes, mouth, nose -> face, not hair
            remove |= comp
    remove = cv2.dilate(remove.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    # ink that outlines the bare chin/cheek (next to the removed face and near empty background) goes too
    empty = cv2.dilate((a < 40).astype(np.uint8), np.ones((29, 29), np.uint8)) > 0
    dark = (bgra[:, :, :3].sum(2) < 260)
    stray = dark & empty & cv2.dilate(remove.astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
    out = bgra.copy(); out[(remove | stray), 3] = 0
    n3, lab3, st3, _ = cv2.connectedComponentsWithStats((out[:, :, 3] > 127).astype(np.uint8))
    if n3 > 1:
        big = st3[1:, cv2.CC_STAT_AREA].max()
        for i in range(1, n3):
            if st3[i, cv2.CC_STAT_AREA] < 0.01 * big: out[lab3 == i, 3] = 0
    return (out, (hx0, hy0, hx1, hy1)) if with_box else out


def split_front_back(bgra, face_box=None):
    """Return (front, back). Needs the face hull, so call hair_only_with_hull instead when available."""
    return bgra, None
