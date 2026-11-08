# Merzkava Pocket — Character Pixel Base, Eight Directions & Art Style

**Status:** TOP-PRIORITY HARD REFERENCE — supersedes the earlier 64 × 64 draft and the former five mixed body/style presets  
**Scope:** Human character base, modular hairstyles/outfits, body proportions, eight directions, and matching world scale  
**Authoring:** Augusto Carvalho's `pxl` (`.px.js` source; PNG, sprite-sheet JSON, and animation exports)  
**Visual reference:** User-supplied Cotienlo “Tiểu Hồ Tiên” character sheet. Use it as a guide to proportions, pixel treatment, silhouette clarity, and directional readability. Do not copy its character identity or costume design.

---

## 1. Non-negotiable production rules

1. Draw character art with **Augusto Carvalho's `pxl` pixel-art workflow**. The editable source is `.px.js`; exported game art is pixel PNG/sprite sheets with JSON metadata.
2. **No SVG for characters, character animation, or game-world character art.** Do not replace pixel sprites with vector paths, SVG illustrations, or CSS-drawn characters.
3. Preserve a deliberately authored pixel grid. Do not blur, smooth-scale, or paint over the pixels with a soft raster brush.
4. The supplied Cotienlo sheet is the highest-priority visual reference for human chibi proportions, pixel-cluster rendering, silhouette clarity, and eight-direction readability.
5. The initial Pocket base is **human only**: no animal ears, no tail, no muzzle, and no furry anatomy. Furry variants are a separate future character family and must not leak into the human base.
6. Hairstyle and outfit are independent selections. A hairstyle must work with every outfit; an outfit must work with every hairstyle without changing the shared body anatomy.
7. Keep anatomy dimensions consistent in all eight directions. Hair, clothing, held objects, and effects are silhouette layers; they must not distort the underlying body proportions.
6. Review the native-size sprite and an enlarged nearest-neighbour preview before accepting it. A sprite that looks attractive only when enlarged is not approved.

## 2. Standard sprite cell and human anatomy measurements

**Working cell: 48 × 64 px per direction.** This is the Pocket human gameplay frame. It supersedes the earlier 64 × 64 draft. The head remains large and expressive, the neck is extremely short, and the body is a compact human chibi silhouette beneath layered clothing.

| Part | Working size | Placement / proportion |
|---|---:|---|
| Full human sprite, including hairstyle and clothing | **about 34–38 × 60–62 px** | Centered in the 48 × 64 frame; shared foot anchor |
| Head, excluding hair | **20–21 × 19–20 px** | Rounded human head; no ears or animal features |
| Visible face area | about 13–15 × 12–14 px | Compact eyes and tiny mouth/nose clusters |
| Neck | **3 × 3 px** | Very short; largely covered by the collar |
| Shoulder span | about 18–20 px | Rounded, narrow chibi shoulders |
| Torso, shoulder to waist | **18–20 × 14–16 px** | Short, compact body core |
| Waist / sash zone | about 16–18 × 4 px | Clear transition under crossed lapels |
| Legs / shoes | about 16–20 × 13–16 px | Short lower body; clothing may cover most of the legs |
| Hair silhouette | hairstyle-specific, generally within the head width plus 2–4 px | No pointed animal-ear shapes; hair remains separate from the head anatomy |
| Clothing silhouette | outfit-specific, generally 32–38 px wide | Broad readable robe silhouette; do not widen the shoulders to fit sleeves |

### Proportion hierarchy

- **Head:** visually dominant, approximately one third of the visible body height. The face is contained within the head and is not independently enlarged.
- **Neck:** almost absent at gameplay scale. Do not draw a long exposed neck.
- **Torso:** short and compact, with a clear shoulder-to-waist transition.
- **Lower body:** short, with small feet and a stable shared ground anchor.
- **Silhouette:** long hair and long robes may extend toward the ground, but the anatomical body stays the same across all styles.
- **Human-only boundary:** no ears, tail, horns, animal muzzle, or furry body parts on this base.

### Pixel-coordinate guide for the 48 × 64 cell

The following is the shared construction guide used by the initial PXL human base:

- Frame size: **48 × 64 px**.
- Body centreline: **x = 24**.
- Ground / foot anchor: **y = 62**.
- Lowest body pixels: **y = 60–63**.
- Leg and shoe area: approximately **y = 46–63**.
- Waist / sash transition: approximately **y = 37–43**.
- Torso and sleeve area: approximately **y = 25–43**.
- Neck: approximately **x = 22–25, y = 24–27**.
- Head mass: approximately **x = 14–34, y = 5–25**.
- The hair may extend beyond the head mass but must remain inside the frame; the clothing may extend to approximately **x = 7–41** while keeping the body centred.

These coordinates are a shared starting template, not a demand that every outfit have the same outer contour. Do not resize the head, neck, or torso to fit a garment; alter the clothing layer instead.

## 3. Eight-direction hard reference

Every playable human character must have a complete and consistently named **eight-direction set**. The same human must remain recognisable from front, diagonal, profile, and rear views. Do not rotate or mirror a front image to fake the other directions.

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

- All eight views use the same **48 × 64 px** cell, body scale, foot anchor, head-to-body ratio, and palette logic.
- The front view (`S`) is the facial identity reference. The back view (`N`) must retain the same hair length, hair volume, and clothing silhouette.
- Diagonal views must visibly sit between adjacent cardinal views. They must not be front sprites rotated by 45 degrees.
- Side views (`E`, `W`) must show an actual human profile: forehead/nose/chin contour, hair depth, chest-to-back contour, and garment overlap.
- Do not automatically mirror one side to create the other when the hairstyle, parting, hair clip, sash, sleeve, or other costume details are asymmetric.
- Keep the head and torso centred over the same foot anchor. Direction may change the contour but not the character's height or apparent body size.
- Hair must remain attached to the scalp and turn with the head. Long locks should layer correctly over the shoulders and back.
- Outfit panels and sleeves must occlude the body correctly as the character turns. Crossed lapels should not swap sides arbitrarily.
- Held props must follow the hand and disappear behind the body naturally when appropriate.
- The eight direction tags must remain consistent with Pocket's isometric movement mapping; do not reverse `N` and `S` between actors or scenes.

### Modular hairstyle and outfit system

The human base uses one shared anatomy and two independent appearance selections.

**Initial hairstyles:**
- `long_black` — long straight grouped locks.
- `soft_bob` — rounded short bob.
- `half_up` — gathered half-up knot with long side locks.
- `high_tie` — high gathered hairstyle.
- `long_waves` — long stepped waves.

**Initial outfits:**
- `black_hanfu` — ink-black layered hanfu with crossed lapels and restrained antique-gold edging.
- `ivory_layers` — warm ivory panels with pale jade lining.
- `jade_scholar` — long jade scholar robe.
- `rose_ceremony` — broad muted-rose ceremonial mantle with antique-gold accents.
- `traveller_robe` — asymmetric traveller robe with leather-toned accents.

Any of the five hairstyles must be compatible with any of the five outfits. This creates 25 visual combinations while keeping the anatomy and animation frame dimensions unchanged. Costume design is deliberately separate from the original Cotienlo garment; only the pixel-rendering approach is referenced.

### Animation readiness

The standing eight-direction set is the minimum foundation. The human base uses a **four-frame idle** and an **eight-frame walk cycle for each of the eight directions**. The walk cycle is not a four-frame loop duplicated twice: it has a complete alternating gait with contact, passing, lift, and settle poses. Each direction has its own authored animation.
 
The eight-frame walk uses opposing arm swing, alternating foot position/lift, restrained head bob, a small robe-hem sway, and a subtle hair-tip follow-through. The motion must remain calm and readable at native size, with no uncontrolled body wobble. The foot anchor and 48 × 64 anatomy remain consistent through the entire cycle. Run, attack, gather, interact, sit, and skill/action animations should later use the same frame dimensions and body proportions.

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

### 4.7 Hair and soft accessories

- Hair is a major part of the silhouette. Give it a clear outer mass, fringe shape, side locks, and distinct back locks.
- Long hair follows gravity and movement, with grouped locks and clean stepped ends.
- Hair ornaments, ribbons, beads, and clips are optional small accents. They must not overpower the face or create false animal-ear silhouettes.
- The human base must not contain animal ears, a tail, a muzzle, or furry anatomy.
- Furry characters will be authored as a separate future family using their own hard reference and body adaptation. Do not mix those features into this human base.

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

1. **Gameplay sprite:** the native 48 × 64 human directional frame set; clear silhouette and minimal detail.
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

## 7. World-scale relationship

The character is the world-scale reference for Pocket's isometric scene.

- The human gameplay sprite is authored at **48 × 64 px**.
- Existing world map artwork, facility/building sprites, trees, rocks, water effects, and world-space placement coordinates use a shared **1.5× scale multiplier** relative to the former 32 × 42 human sprite baseline.
- The map's logical facility grid and saved tile coordinates remain unchanged. Their rendered world positions are scaled together, so saved building locations do not drift.
- Buildings and scenery must not be scaled independently against the human sprite. Preserve their former relative proportions while moving the entire scene to the new character scale.
- Character frames are already authored at the new native size and must not receive the world-art 1.5× multiplier a second time.
- Keep the Phaser renderer in pixel-art / nearest-neighbour mode. Do not apply blur or smooth interpolation to enlarged pixel assets.

---

## 8. Approval checklist

A character is not ready for Pocket integration until all of these pass:

- [ ] Uses `pxl` source, not SVG or CSS drawing.
- [ ] Uses the 48 × 64 directional cell and consistent foot anchor.
- [ ] Human base contains no animal ears, tail, muzzle, or furry body parts.
- [ ] Hair and outfit are independently selectable and all 25 combinations use the same base anatomy.
- [ ] Head, neck, torso, waist, and lower-body measurements remain within the defined proportion range.
- [ ] All eight direction tags exist and are recognisable.
- [ ] Diagonal and profile views are genuinely redrawn, not mechanically rotated front sprites.
- [ ] Hair, ears, tail, held props, and costume remain attached and correctly occluded as the character turns.
- [ ] Pixel clusters, outlines, shading, palette, and highlights follow the art-style specification.
- [ ] Face remains readable at native size.
- [ ] Costume design is independently created and has not copied the Cotienlo reference outfit.
- [ ] Sprite sheet, JSON metadata, and editable `.px.js` source are retained.

**Hard boundary:** This document locks the character's pixel-art presentation, body proportions, and eight-direction requirements. It does not finalize any character's costume, species, lore, faction, personality, or animation list.
