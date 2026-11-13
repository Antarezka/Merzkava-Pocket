// Hand-inked look: rough dark outline + paper grain + muted wash. Applied to baked sprites/portraits.
import { createCanvas, mulberry32, hash2, fbm, parseHex, TAU } from "./paint.js";

let grainTile = null;
function getGrain() {
  if (grainTile) return grainTile;
  const n = 128, c = createCanvas(n, n), x = c.getContext("2d"), img = x.createImageData(n, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = fbm(i / 5, j / 5, 11, 3) * 0.6 + hash2(i, j, 5) * 0.4, k = (j * n + i) * 4, g = 120 + v * 135;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); return (grainTile = c);
}

/** returns a new canvas (padded by `pad`) with ink outline + paper texture. */
export function inkify(src, { outline = 2.4, ink = "#2a1f2e", grain = 0.22, pad = 4, seed = 3, mute = 0.12 } = {}) {
  const w = src.width + pad * 2, h = src.height + pad * 2, out = createCanvas(w, h), o = out.getContext("2d");
  // 1. silhouette (tinted) stamped around in a ring with jittered radius => rough outline
  const sil = createCanvas(w, h), s = sil.getContext("2d"), rnd = mulberry32(seed);
  s.drawImage(src, pad, pad); s.globalCompositeOperation = "source-in"; s.fillStyle = ink; s.fillRect(0, 0, w, h);
  const steps = 14;
  for (let r = outline; r > 0.4; r -= outline / 2.4) for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU + rnd() * 0.3, rr = r * (0.75 + rnd() * 0.55);
    o.drawImage(sil, Math.cos(a) * rr, Math.sin(a) * rr);
  }
  // 2. body
  o.drawImage(src, pad, pad);
  // 3. muted wash + paper grain only where the body is
  const tex = createCanvas(w, h), t = tex.getContext("2d");
  t.drawImage(out, 0, 0); t.globalCompositeOperation = "source-atop";
  const [r, g, b] = parseHex("#d8c9a8"); t.globalAlpha = mute; t.fillStyle = `rgb(${r},${g},${b})`; t.fillRect(0, 0, w, h);
  t.globalAlpha = grain; t.globalCompositeOperation = "source-atop";
  const pat = t.createPattern(getGrain(), "repeat"); t.globalCompositeOperation = "multiply"; t.fillStyle = pat; t.fillRect(0, 0, w, h);
  // multiply spills outside alpha; clip to original coverage
  t.globalCompositeOperation = "destination-in"; t.globalAlpha = 1; t.drawImage(out, 0, 0);
  // 4. dry-brush specks on the outline
  t.globalCompositeOperation = "destination-out";
  for (let i = 0; i < w * h / 900; i++) { t.globalAlpha = 0.5 + rnd() * 0.4; t.beginPath(); t.arc(rnd() * w, rnd() * h, 0.5 + rnd() * 0.7, 0, TAU); t.fill(); }
  return { canvas: tex, pad };
}
