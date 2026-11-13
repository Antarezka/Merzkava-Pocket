"""Re-trace a flat/cel-shaded reference cut-out into crisp, smooth, high-resolution art.

Pipeline: upscale -> k-means palette -> one-hot class maps -> Gaussian smooth -> argmax
(smooth region boundaries like a vector trace) -> flat palette fill -> supersampled alpha.
"""
import cv2, numpy as np


def cutout(bgr, near_white=185, chroma=14):
    """Alpha mask of the figure: everything not connected-neutral-white to the border."""
    h, w = bgr.shape[:2]
    mx = bgr.max(axis=2).astype(int); mn = bgr.min(axis=2).astype(int)
    neutral = (((mx - mn) < chroma) & (mn > near_white)).astype(np.uint8)
    pad = cv2.copyMakeBorder(neutral, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=1)
    mask = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(pad, mask, (0, 0), 2)
    fg = (pad[1:-1, 1:-1] != 2).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        fg = ((lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])) * 255).astype(np.uint8)
    inv = 255 - fg; ff = inv.copy(); m2 = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, m2, (0, 0), 0)
    return fg | ff


def crisp(bgr, fg, scale=6, k=6, sigma=2.2, seed=1):
    """Return BGRA at `scale`x with smooth flat-palette regions."""
    h, w = bgr.shape[:2]
    up = cv2.resize(bgr, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(fg, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(a, (0, 0), scale * 0.45)
    a = np.clip((a.astype(np.float32) - 127) * 3.2 + 127, 0, 255).astype(np.uint8)
    inside = a > 127
    # pre-clean JPEG noise while keeping edges
    cl = cv2.bilateralFilter(up, 9, 22, 6)
    data = cl[inside].reshape(-1, 3).astype(np.float32)
    if len(data) > 200000:
        rng = np.random.default_rng(seed); sub = data[rng.choice(len(data), 200000, replace=False)]
    else:
        sub = data
    cv2.setRNGSeed(seed)
    _, _, centers = cv2.kmeans(sub, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    # assign every pixel to nearest centre (chunked)
    H, W = up.shape[:2]
    flat = cl.reshape(-1, 3).astype(np.float32)
    d = np.empty((flat.shape[0], k), np.float32)
    for i in range(k):
        d[:, i] = ((flat - centers[i]) ** 2).sum(1)
    lab = d.argmin(1).reshape(H, W)
    # smooth boundaries: blur each one-hot map, argmax
    best = np.full((H, W), -1.0, np.float32); out = np.zeros((H, W), np.int32)
    for i in range(k):
        m = cv2.GaussianBlur((lab == i).astype(np.float32), (0, 0), sigma * scale / 2)
        upd = m > best; best[upd] = m[upd]; out[upd] = i
    rgb = centers[out].astype(np.uint8)
    return np.dstack([rgb, a]), centers


def tight_crop(bgra, pad=12):
    ys, xs = np.where(bgra[:, :, 3] > 8)
    return bgra[max(0, ys.min() - pad):ys.max() + pad + 1, max(0, xs.min() - pad):xs.max() + pad + 1]
