# Merzkava Pocket — Character Pixel Base, Eight Directions & Art Style

**Status:** HARD REFERENCE — character proportions, pixel-art rendering, and eight-direction coverage  
**Scope:** Character base anatomy and sprite presentation for Merzkava Pocket  
**Authoring:** Augusto Carvalho's `pxl` (`.px.js` source; PNG, sprite-sheet JSON, and animation exports)  
**Visual reference:** User-supplied Cotienlo “Tiểu Hồ Tiên” character sheet. Use it as a guide to proportions, pixel treatment, silhouette clarity, and directional readability. Do not copy its character identity or costume design.

---

## 1. Non-negotiable production rules

1. Draw character art with **Augusto Carvalho's `pxl` pixel-art workflow**. The editable source is `.px.js`; exported game art is pixel PNG/sprite sheets with JSON metadata.
2. **No SVG for characters, character animation, or game-world character art.** Do not replace pixel sprites with vector paths, SVG illustrations, or CSS-drawn characters.
3. Preserve a deliberately authored pixel grid. Do not blur, smooth-scale, or paint over the pixels with a soft raster brush.
4. The reference's anatomy, pixel rendering, silhouette, and eight-direction readability are hard references. Costume design is a separate design task and must not be copied from the reference.
5. Keep anatomy dimensions consistent in all eight directions. Hair, ears, tails, held objects, clothing, and effects are additional silhouette layers; they must not distort the underlying body proportions.
6. Review the native-size sprite and an enlarged nearest-neighbour preview before accepting it. A sprite that looks attractive only when enlarged is not approved.

## 2. Standard sprite cell and anatomy measurements

**Working cell: 64 × 64 px per direction.** This is the recommended Pocket production grid, not a claim about the original source file's dimensions. It gives the chibi body enough breathing room for directional silhouettes, long hair, ears, and a tail.

| Part | Working size | Placement / proportion |
|---|---:|---|
| Full body, excluding optional protruding accessories | about 28–32 × 58–60 px | Centered on the cell; feet share one ground line |
| Head, hair-cap excluded; ears excluded | **24–26 × 20–22 px** | Roughly the upper third of the visible body |
| Face area within head | about 14–17 × 12–14 px | Small, readable facial features; do not enlarge the face independently |
| Neck | **3–4 × 2–3 px** | Very short; mostly hidden by hair, collar, or shoulder line |
| Shoulder span | about 19–22 px | Narrow and rounded; avoid adult-proportioned shoulders |
| Torso, shoulder to waist | **18–20 × 15–17 px** | Compact, visibly shorter than the head's height |
| Waist / pelvis block | about 14–18 × 4–6 px | Narrow transition between torso and lower body |
| Legs and feet together | about 14–18 × 13–15 px | Short chibi lower body; small feet, stable ground contact |
| Optional ears | about 5–8 px each in width; height varies by character | Outside the head measurement |
| Optional tail / large hair mass | character-specific | Separate silhouette volume; never counted as torso width |

### Proportion hierarchy

- **Head:** large and visually dominant. The head height should read as approximately one third of the character's body height, excluding tall ears and decorative hair ornaments.
- **Neck:** almost absent at gameplay scale. Do not draw a long exposed neck.
- **Torso:** short, compact, and slightly narrower than the head. The waist transition is clear but not anatomically realistic.
- **Lower body:** short. Feet remain small and close to the ground anchor.
- **Overall read:** cute, compact, and balanced; never turn the character into a realistic human scaled down.

### Pixel-coordinate guide for the 64 × 64 cell

Use this as an initial construction guide, then adjust the silhouette without changing the target proportions:

- Ground / foot anchor: approximately **y = 61**.
- Lowest body pixels: approximately **y = 59–62**.
- Leg and foot block: approximately **y = 47–61**.
- Pelvis / waist transition: approximately **y = 43–49**.
- Torso: approximately **y = 27–45**.
- Neck: approximately **y = 25–28**.
- Head mass: approximately **y = 5–27**; ears and ornamental hair may extend above this.
- Body centerline: approximately **x = 32**.
- The body core should normally remain within **x = 18–46**. Hair, ears, tails, and held props may extend farther, provided they remain inside the cell or are intentionally handled by an explicitly documented oversize frame.

These coordinates are a shared starting template, not a demand that every costume have the same outer silhouette. Do not resize the head or torso to make a costume fit; adjust the costume layers instead.

## 3. Eight-direction hard reference

Every playable character must have a complete and consistently named **eight-direction set**. The supplied sheet demonstrates the important idea: the same character can be recognized from front, diagonal, side, and rear views—not merely by mirroring one front sprite.

Use this canonical direction order for file names, metadata, and animation tags:

| Order | Direction tag | View |
|---:|---|---|
| 1 | `N` | Back, facing away from the camera |
| 2 | `NE` | Back-diagonal, toward the upper-right |
| 3 | `E` | Right profile |
| 4 | `SE` | Front-diagonal, toward the lower-right |
| 5 | `S` | Front, facing the camera |
| 6 | `SW` | Front-diagonal, toward the lower-left |
| 7 | `W` | Left profile |
| 8 | `NW` | Back-diagonal, toward the upper-left |

### Direction rules

- All eight views use the same 64 × 64 cell, body scale, ground anchor, head-to-body ratio, and palette logic.
- The front view (`S`) is the facial identity reference. The back view (`N`) must retain the same head mass, hair length, ear placement, tail attachment, and costume volume.
- Diagonal views must visibly sit between the adjacent cardinal views. Do not draw a front sprite and rotate it by 45 degrees.
- Side views (`E`, `W`) must show a believable profile: nose/face projection, hair depth, chest-to-back contour, and tail attachment.
- Do not automatically mirror one side to create the other when the character has asymmetric hair ornaments, clothing details, accessories, held items, or tail direction. Draw the actual opposite-facing view.
- Keep the head and torso centered over the same foot anchor. Direction may change the visible contour, but not the character's height or apparent body size.
- Preserve recognisable identifiers in every view: hair silhouette, ear shape, tail shape, head ornament, and major costume colour blocks.
- Props held by the character must swap hands or disappear behind the body naturally as the view changes. They must not float at a fixed screen coordinate.
- For isometric gameplay, map world movement to these screen-space directions consistently. Do not silently reverse `N` and `S` between characters or scenes.

### Animation readiness

The eight standing directions are the minimum directional foundation. Walk, idle, run, attack, gather, interact, sit, and skill/action animations should be authored as named `pxl` animation tags built on the same directional rig or matching frame sets. Motion must preserve foot contact and avoid uncontrolled bobbing. A direction-specific animation must not change the character's proportions between frames.

---

## 4. Detailed art-style specification

### 4.1 Overall visual identity

The target is **polished, high-detail chibi pixel art with a soft, whimsical fantasy character design**. It is not generic low-resolution retro pixel art, and it is not a smooth vector illustration converted into pixels.

The character should feel like a carefully hand-authored game sprite: instantly readable at small size, rich in silhouette, and charming when viewed up close. Large forms are simple and clear; fine details are concentrated around the face, hair, costume edges, and signature accessories.

### 4.2 Shape language and silhouette

- Use rounded, soft, organic masses for the head, cheeks, hair, sleeves, and tails.
- Combine those soft masses with a few clear pointed accents: ear tips, hair tufts, ribbons, ornaments, and selected garment corners.
- Keep the head large, body compact, limbs short, and feet small. Avoid realistic anatomy and long, thin limbs.
- Build hair as several readable locks and grouped tufts, not as dozens of independent thin strands.
- Large tails should read as one strong fluffy shape first, with a few separated tufts or highlight clusters second. Avoid a noisy feather-by-feather outline.
- Keep the outer contour recognizable against both light and dark backgrounds. The character's identity must survive when reduced to a tiny gameplay size.

### 4.3 Pixel construction and edge treatment

- Use deliberate pixel clusters with stepped contours. Each cluster should describe a form, material, fold, or lighting plane.
- Keep pixel edges crisp and aligned to the working grid. Use controlled one-pixel stair steps on diagonals and curves.
- Use selective anti-aliasing only where two close tones need a controlled transition. It must still read as pixels; never apply global blur or smooth vector-like anti-aliasing.
- Use clusters of different sizes: larger blocks for hair and fabric masses, medium clusters for shadows and folds, and tiny clusters only for eyes, jewellery, trim, and glints.
- Do not sprinkle isolated pixels randomly. A stray pixel must have a clear job: highlight, texture, contour, or small material feature.
- Avoid thick black outlines around every single part. Use a dark warm outline where separation is needed, and let nearby shadow tones define internal boundaries.
- Keep the character legible at native size. Do not rely on a high-resolution preview to make tiny details understandable.

### 4.4 Outline, shading, and highlights

- Prefer deep warm charcoal, dark umber, or a hue-shifted shadow colour over pure black for most outlines.
- Use a slightly stronger contour on the outer silhouette and lighter/selective internal boundaries.
- Shade with compact, hard-edged pixel clusters. Shadows should follow the shape of the hair, cheek, sleeve, collar, and fabric folds.
- Hair uses layered light, middle, and shadow tones. Highlights follow the flow of each lock rather than forming a uniform glossy stripe.
- Fabric uses broad, readable light and shadow planes with a few narrow fold accents; do not turn the garment into a mass of thin stripes.
- Fur uses soft stepped tufts and grouped value changes. Do not use noisy dithering to imitate individual hairs.
- Reserve the brightest pixels for a few deliberate highlights: eye glints, hair shine, polished ornaments, lantern glow, or a tiny metal edge.
- Dithering is optional and very restrained. The reference's finish is based primarily on clean colour clusters, not dense checkerboard texture.

### 4.5 Palette and colour relationships

The reference suggests a gentle warm-fantasy palette rather than saturated arcade colours:

- **Light base:** ivory, warm white, cream, and pale silver.
- **Cool secondary tones:** pale mint, soft jade, or muted blue-green.
- **Warm accents:** blush pink, dusty rose, peach, and restrained coral-red.
- **Material accents:** soft antique gold, honey beige, and warm lantern yellow.
- **Deep tones:** charcoal, dark umber, muted burgundy, and subdued brown for outlines, shoes, hair shadows, and small details.

Use hue-shifted shadow colours instead of merely darkening the same hue. Maintain enough value contrast to separate hair from face, sleeve from body, and tail from background. Avoid making every element equally bright or equally saturated.

This palette describes the reference's rendering mood. It does **not** prescribe Merzkava character uniforms, faction colours, or costume identities.

### 4.6 Face and expression

- Keep the face compact within the oversized head.
- Eyes are small relative to the head but have a strong dark shape and a limited warm accent. Use only a few pixels for highlights.
- Eyebrows, nose, and mouth are minimal. Do not render realistic facial anatomy.
- Cheek blush may use a small soft pink cluster.
- Expressions should be readable through a few intentional pixels: neutral, happy, focused, sleepy, or determined.
- Keep facial placement consistent across the eight directions. Profile views need a simplified side-facing eye and nose contour rather than a front face pasted onto the head.

### 4.7 Hair, ears, tails, and soft accessories

- Hair should be a major part of the character silhouette. Give it a clear outer mass, a fringe shape, side locks, and a few distinct back locks.
- Long hair should follow gravity and movement, with grouped locks and clean stepped ends.
- Animal ears, when a character has them, are part of the head silhouette and must have consistent attachment points and inner-ear colour blocks across directions.
- A fluffy tail is built from a broad base and a few large tuft clusters. Its root must remain anatomically attached and its shape must turn convincingly with the character.
- Ribbons, clips, beads, flowers, and ornaments should be small accents. Do not allow decoration to overpower the face.
- These traits are examples of the reference's shape treatment, not mandatory features for every Merzkava character.

### 4.8 Clothing material rendering — not costume design

The reference renders layered fantasy clothing with compact pixel shapes: broad garment panels, visible sleeve volume, a clear waist division, restrained trim, and a few simple fold clusters. Fabric is differentiated through silhouette, value grouping, and edge accents rather than painted texture.

For Merzkava Pocket:
- Keep this **pixel rendering approach** for fabric, leather, fur, metal, and ornaments.
- Build sleeves, hems, collars, belts, and layered panels as readable clusters at native size.
- Use a small number of fold and seam accents. Avoid excessive embroidery pixels that disappear or become visual noise on a phone.
- Let each material have its own palette ramp and highlight behaviour.
- **Do not copy the reference's hanfu, dress silhouette, colour placement, sleeves, belt, or ornament arrangement.** Costume silhouette, cultural references, faction identity, materials, and colours will be designed separately for Merzkava.

### 4.9 Lighting and effects

- Keep character lighting coherent across all eight directions and all frames of an animation.
- Use local highlights on hair, eyes, metal, and lanterns; keep glow small enough that the pixel silhouette remains clear.
- Effects such as lantern light, spirit energy, spell trails, and impact flashes should be separate pixel-art layers or effects authored through `pxl`, not SVG.
- Any glow or transparency must preserve crisp sprite edges and must not wash out the character's palette.

### 4.10 What this style is not

Do not replace the reference with:
- smooth vector art, SVG characters, CSS silhouettes, or icon-like humanoids;
- 3D-rendered characters with a pixel filter applied afterward;
- blurry digital painting, airbrushed gradients, or soft photographic textures;
- generic 8-bit sprites with a few large square pixels and no cluster-level form;
- noisy pixel dithering, excessive single-pixel decoration, or heavy black borders around everything;
- realistic human proportions, long necks, adult shoulder width, or oversized hands and feet.

---

## 5. Character-sheet presentation guidance

The supplied reference presents one character through several useful views: a prominent full-body sprite, a compact directional turnaround, and separate portrait / representative-frame artwork. Pocket may use the same **separation of asset roles**:

1. **Gameplay sprite:** the native 64 × 64 directional frame set; clear silhouette and minimal detail.
2. **Character turnaround:** all eight directions at the same scale and ground anchor for approval.
3. **Portrait / representative image:** a separately composed, higher-detail pixel-art or illustrated presentation asset; it must not be substituted for the gameplay sprite.
4. **Nameplate / title ornament:** a separate UI asset, not baked into the character sprite.
5. **Action animation previews:** named examples of movement and action, kept separate from the static directional reference.

Decorative portrait frames, floral ornaments, banners, and title plaques in the supplied sheet are presentation ideas only. They are not part of the character's anatomy or gameplay sprite.

## 6. Augusto Carvalho pxl workflow

Use the actual `pxl` pipeline for authoring and verification:

1. Create or update the character's `.px.js` source file.
2. Define a compact palette and reusable pixel-art parts where appropriate.
3. Construct the base body and face before adding hair, costume, tail, or held props.
4. Build and review all eight directions against the same frame and foot anchor.
5. Add named animation tags only after the static directions read consistently.
6. Build PNG sprites and sprite-sheet JSON from the source.
7. Inspect both native-size output and the enlarged pixel-grid preview; patch the source and rebuild when needed.
8. Keep the `.px.js` source as the editable source of truth. Do not make the exported PNG the only surviving source.

Useful project reference: https://github.com/augusto-scarvalho/claude-pxl

## 7. Approval checklist

A character is not ready for Pocket integration until all of these pass:

- [ ] Uses `pxl` source, not SVG or CSS drawing.
- [ ] Uses the 64 × 64 directional cell and consistent foot anchor.
- [ ] Head, neck, torso, waist, and lower-body measurements remain within the defined proportion range.
- [ ] All eight direction tags exist and are recognisable.
- [ ] Diagonal and profile views are genuinely redrawn, not mechanically rotated front sprites.
- [ ] Hair, ears, tail, held props, and costume remain attached and correctly occluded as the character turns.
- [ ] Pixel clusters, outlines, shading, palette, and highlights follow the art-style specification.
- [ ] Face remains readable at native size.
- [ ] Costume design is independently created and has not copied the Cotienlo reference outfit.
- [ ] Sprite sheet, JSON metadata, and editable `.px.js` source are retained.

**Hard boundary:** This document locks the character's pixel-art presentation, body proportions, and eight-direction requirements. It does not finalize any character's costume, species, lore, faction, personality, or animation list.
