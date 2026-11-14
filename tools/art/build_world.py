"""Name the extracted atlas objects, strip the pale cast-shadow fringe, and bake autumn colour variants of the trees."""
import sys, os, json, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
NAMES = {0: "tree_round", 1: "tree_dark", 2: "tree_amber", 3: "tree_pine", 4: "tree_willow", 5: "tree_palm", 6: "tree_bonsai", 7: "tree_sakura", 8: "tree_fruit", 9: "tree_blossom", 10: "tree_teal",
         11: "bush_a", 12: "bush_flower_a", 13: "bush_b", 14: "bush_flower_b", 15: "bush_orange",
         28: "rock_s1", 29: "rock_s2", 30: "rock_m1", 31: "rock_m2", 32: "rock_cluster", 33: "rock_big_moss", 34: "rock_tall", 38: "pebble_big", 44: "rock_flat",
         35: "stump", 36: "log_hollow", 37: "branch_dead", 39: "fence_end", 40: "log", 41: "leaf_pile", 42: "sticks", 43: "fence_post", 48: "mushroom_red", 49: "mushroom_brown", 52: "mushroom_big"}
for i in list(range(16, 28)) + [45, 46, 47, 50, 51]: NAMES[i] = f"plant_{i}"
objs = json.load(open(os.path.join(src, "objects.json")))["objects"]; made = {}
def clean(bgra):
    b = bgra.copy(); mx = b[..., :3].max(2).astype(int); mn = b[..., :3].min(2).astype(int); lum = b[..., :3].mean(2)
    pale = ((mx - mn) < 15) & (lum > 168); b[..., 3][pale] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats((b[..., 3] > 20).astype(np.uint8))
    if n > 1:
        big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); b[..., 3][lab != big] = 0
    a = (b[..., 3] > 20).astype(np.uint8); er = cv2.erode(a, np.ones((7, 7), np.uint8)); band = (a > 0) & (er == 0)
    rim = band & (lum > 150) & ((mx - mn) < 60); b[..., 3][rim] = 0
    b[..., 3] = cv2.GaussianBlur(b[..., 3], (3, 3), 0)
    ys, xs = np.where(b[..., 3] > 8); return b[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
for i, o in enumerate(objs):
    if i not in NAMES: continue
    im = clean(cv2.imread(os.path.join(src, o["file"]), cv2.IMREAD_UNCHANGED)); cv2.imwrite(os.path.join(out, NAMES[i] + ".png"), im); made[NAMES[i]] = im
# autumn tree colourways: shift the green foliage (upper 72% of the sprite) to the target hue family
TREE_BASES = ["tree_round", "tree_dark", "tree_bonsai", "tree_pine", "tree_willow", "tree_blossom"]
WAYS = {  # name: (hue 0..179, sat mult, val mult)
    "orange_light": (17, 1.05, 1.18), "orange_dark": (11, 1.15, 0.88), "peach": (7, 0.62, 1.30), "rust": (4, 1.10, 0.78),
    "olive": (31, 0.78, 0.92), "gold": (23, 1.05, 1.22), "crimson": (176, 1.0, 0.9), "plum": (150, 0.7, 0.85)}
tinted = []
for base in TREE_BASES:
    im = made[base]; h = im.shape[0]; hsv = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2HSV).astype(np.float32)
    green = (hsv[..., 0] > 28) & (hsv[..., 0] < 100) & (hsv[..., 1] > 45); green[int(h * 0.72):] = False
    for w, (hue, sm, vm) in WAYS.items():
        t = hsv.copy(); t[..., 0][green] = hue; t[..., 1][green] = np.clip(t[..., 1][green] * sm, 0, 255); t[..., 2][green] = np.clip(t[..., 2][green] * vm, 0, 255)
        bgr = cv2.cvtColor(t.astype(np.uint8), cv2.COLOR_HSV2BGR); res = np.dstack([bgr, im[..., 3]])
        nm = f"{base}_{w}"; cv2.imwrite(os.path.join(out, nm + ".png"), res); tinted.append(nm)
json.dump({"objects": {k: {"w": int(v.shape[1]), "h": int(v.shape[0])} for k, v in made.items()}, "tree_colourways": list(WAYS), "tree_shapes": TREE_BASES}, open(os.path.join(out, "world.json"), "w"), indent=1)
# contact sheet of tinted trees
cw = 150; cols = len(WAYS); rows = len(TREE_BASES); sheet = np.full((rows * cw, cols * cw, 3), (159, 185, 203), np.uint8)
for r, base in enumerate(TREE_BASES):
    for c, w in enumerate(WAYS):
        t = cv2.imread(os.path.join(out, f"{base}_{w}.png"), cv2.IMREAD_UNCHANGED); s = min((cw - 8) / t.shape[1], (cw - 8) / t.shape[0]); t = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        oy, ox = r * cw + (cw - t.shape[0]) - 4, c * cw + (cw - t.shape[1]) // 2; a = t[..., 3:4] / 255.0
        sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] = (t[..., :3] * a + sheet[oy:oy + t.shape[0], ox:ox + t.shape[1]] * (1 - a)).astype(np.uint8)
cv2.imwrite(os.path.join("/tmp/claude-0/-home-claude/5cee2730-b7b2-5389-823a-04cb745c5f53/scratchpad", "trees_tinted.png"), sheet); print(len(made), "objects,", len(tinted), "tinted trees")
