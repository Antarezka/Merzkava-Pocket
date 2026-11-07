// PXL entry point for the isolated base + modular wardrobe study.
include("../_pxl-dress.px.js")
include("./base.px.js")
include("./wardrobe/shared.px.js")
include("./wardrobe/hanfu.px.js")
include("./wardrobe/cultivator.px.js")
include("./wardrobe/long-robe.px.js")
include("./wardrobe/assassin.px.js")
include("./wardrobe/sect-guard.px.js")

renderStudyCharacter(STUDY_BASE_STYLE)
renderStudyCharacter(STUDY_HANFU)
renderStudyCharacter(STUDY_CULTIVATOR)
renderStudyCharacter(STUDY_LONG_ROBE)
renderStudyCharacter(STUDY_ASSASSIN)
renderStudyCharacter(STUDY_SECT_GUARD)

sheet("merzkava_character_base_study", [
  "base_*", "hanfu_*", "cultivator_*",
  "long_robe_*", "assassin_*", "sect_guard_*"
], { rows: "tag", pad: 2 })

sheet("merzkava_character_base_study_walk_front", [
  "base_walk_s", "hanfu_walk_s", "cultivator_walk_s",
  "long_robe_walk_s", "assassin_walk_s", "sect_guard_walk_s"
], { rows: "tag", pad: 2 })
