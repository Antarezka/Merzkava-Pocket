# Fox-girl splash asset layers

These are the actual uploaded transparent PNG layers used by the **main Merzkava Pocket splash screen**. This replaces the previous text-only splash rather than adding a second splash route.

| File | Layer | Motion |
|---|---|---|
| `Based 0.png` | Main body / character base | Static anchor |
| `Based 1.png` | Tail component 1 | Part of the slow tail sway |
| `Based 2.png` | Tail component 2 | Part of the slow tail sway |
| `based 3.png` | Tail component 3 | Part of the slow tail sway |
| `ear 1.png` | Ear layer one | Small independent rocking motion |
| `ear 2.png` | Ear layer two | Small independent rocking motion |
| `floating blue-apple.png` | Apple above the palm | Gentle up/down float, slight breathing scale, blue glow |

## Layer alignment

All layers should use a shared canvas size and origin so the PNGs stay aligned when stacked. Transparent pixels must be preserved. Do not crop the parts independently or flatten the illustration.

The three tail PNGs remain stacked on their shared transparent canvas, but each piece gets its own pivot, direction, travel distance, duration, and delay. Their opposing micro-rotations create a slow wave from the base toward the tip. The body stays above the tail; both ear layers and the apple sit above the body.

## Apple color

The apple keeps its supplied artwork. The surrounding light uses the reference hue `#7BC2E2` with a pale cyan-white highlight (`#E7F9FF`) and a softer sky-blue outer halo. This is a restrained analogous blue/cyan glow, not a warm recolor of the fruit.

The app scales the whole illustration down for the splash screen. Anime.js provides the slow tail and ear motion and the gentle apple float; CSS handles the low-cost apple glow pulse and wordmark light spill. Reduced-motion preferences disable the movement and pulse.
