// Merzkava Pocket - human character, 48x64 cell, foot anchor (24,62).
//
// The body is the creator's own hand-drawn chibi base (art/base/user-base-sheet.png).
// It is sliced, downscaled 3x to the 48x64 grid, assembled into 8 directions and then
// dressed with 5 outfits x 5 hairstyles by the offline tools in art/tools (see
// art/tools/README.md). This file only declares the resulting strips to pxl so the
// normal `pxl build` flow exports them with the names the game loads:
//   human_<hair>_<outfit>_<idle|walk>_<dir>            (anims, strips)
//   human_preview_hair_<id> / human_preview_outfit_<id>  (sprites)
const W = 48, H = 64, PIVOT = [24, 62];
const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const HAIR = ["long_black", "soft_bob", "half_up", "high_tie", "long_waves"];
const OUTFITS = ["black_hanfu", "ivory_layers", "jade_scholar", "rose_ceremony", "traveller_robe"];
const MOVES = { idle: { frames: 4, fps: 3 }, walk: { frames: 8, fps: 10 } };

for (const o of OUTFITS) sprite("human_preview_outfit_" + o, { w: W, h: H, pivot: PIVOT, png: "dressed/human_preview_outfit_" + o + ".png" });
for (const h of HAIR) sprite("human_preview_hair_" + h, { w: W, h: H, pivot: PIVOT, png: "dressed/human_preview_hair_" + h + ".png" });

for (const h of HAIR) for (const o of OUTFITS) for (const [mv, m] of Object.entries(MOVES)) for (const d of DIRS) {
  const name = "human_" + h + "_" + o + "_" + mv + "_" + d;
  anim(name, { w: W, h: H, pivot: PIVOT, frames: m.frames, fps: m.fps, png: "dressed/" + name + ".png" });
}
