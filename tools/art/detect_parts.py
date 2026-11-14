"""Auto-detect part boxes on a reference sheet and write a numbered debug overlay.

usage: python3 -I detect_parts.py <sheet.jpg> <overlay.png> [open=7] [grow=11] [min_area=1800]
Text is thin, so a morphological opening drops it while keeping sprites.
Prints: index x y w h
"""
import sys, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
op = int(sys.argv[3]) if len(sys.argv) > 3 else 7
gr = int(sys.argv[4]) if len(sys.argv) > 4 else 11
ma = int(sys.argv[5]) if len(sys.argv) > 5 else 1800
im = cv2.imread(src); h, w = im.shape[:2]
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
fg = ((g < 232) | (hsv[:, :, 1] > 40)).astype(np.uint8) * 255
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (op, op)))
fg = cv2.dilate(fg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (gr, gr)))
n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
boxes = [tuple(int(v) for v in s[:4]) for s in st[1:] if s[4] >= ma]
boxes.sort(key=lambda b: (round((b[1] + b[3] / 2) / 70), b[0]))
ov = im.copy()
for i, (x, y, bw, bh) in enumerate(boxes):
    cv2.rectangle(ov, (x, y), (x + bw, y + bh), (0, 0, 255), 2)
    cv2.putText(ov, str(i), (x + 3, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
    print(i, x, y, bw, bh)
cv2.imwrite(out, ov)
