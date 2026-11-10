# Fox-girl splash asset layers

This folder is reserved for the separately exported illustration layers used by the Merzkava Pocket splash screen.

Place these transparent PNG files here:

| File | Layer |
|---|---|
| `base-0.png` | Main body / character base |
| `base-1.png` | Fox tail; animated with a small, slow sway |
| `ear-1.png` | Ear layer one |
| `ear-2.png` | Ear layer two |
| `apple.png` | Apple hovering above the character's palm |

## Alignment requirements

- Export each layer as a transparent PNG.
- Use the **same canvas width, height, and origin** for all five layers. Keep each part in its original position on that shared canvas; do not crop each layer independently.
- Leave empty pixels transparent. Do not flatten the layers together.
- Keep the tail attachment point and ear roots aligned to the body base.
- Keep the apple at its intended position above the palm.
- The app scales the whole layered illustration down on the splash screen; the tail, ears, and apple animate independently.
- Keep the art in this folder separate from the game-character sprite assets.

The splash code already references these exact filenames. The illustration files themselves have not been added yet, so the character layers remain hidden until the PNGs are placed here.
