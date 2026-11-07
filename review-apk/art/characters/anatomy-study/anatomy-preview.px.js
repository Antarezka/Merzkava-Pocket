// Isolated PXL comparison: ten anatomy rigs, one neutral outfit and one camera scale.
// This is deliberately separate from the existing one-base/five-wardrobe experiment.
include("../_pxl-dress.px.js")
include("../base-study/base.px.js")
include("../base-study/wardrobe/shared.px.js")

const TEN_ANATOMY_PROFILES = [
  {
    id: "anatomy_01_petite", label: "01 Petite", headScale: 1.03, neckWidth: 0.88,
    body: {
      h: 33.6, heads: 2.68, hip: 11.3, torso: 9.8, neck: 6.3,
      thigh: 5.0, shin: 4.8, upper: 3.35, fore: 3.0,
      ankle: 1.1, hips: 1.9, shoulders: [0.50, 4.10, -0.95]
    }
  },
  {
    id: "anatomy_02_slender", label: "02 Slender", headScale: 1.02, neckWidth: 0.86,
    body: {
      h: 35.5, heads: 3.02, hip: 11.4, torso: 10.2, neck: 6.5,
      thigh: 5.7, shin: 5.4, upper: 3.3, fore: 3.0,
      ankle: 1.1, hips: 1.9, shoulders: [0.50, 4.20, -1.0]
    }
  },
  {
    id: "anatomy_03_balanced", label: "03 Balanced", headScale: 1.03, neckWidth: 0.90,
    body: {
      h: 36, heads: 2.85, hip: 12.2, torso: 10.7, neck: 7.0,
      thigh: 5.5, shin: 5.3, upper: 3.6, fore: 3.2,
      ankle: 1.2, hips: 2.1, shoulders: [0.55, 4.55, -1.05]
    }
  },
  {
    id: "anatomy_04_graceful", label: "04 Graceful", headScale: 1.04, neckWidth: 0.85,
    body: {
      h: 35.5, heads: 2.82, hip: 12.7, torso: 10.4, neck: 6.4,
      thigh: 5.6, shin: 5.2, upper: 3.45, fore: 3.1,
      ankle: 1.2, hips: 2.35, shoulders: [0.48, 4.25, -0.98]
    }
  },
  {
    id: "anatomy_05_athletic", label: "05 Athletic", headScale: 1.02, neckWidth: 0.98,
    body: {
      h: 36, heads: 2.98, hip: 12.5, torso: 10.8, neck: 6.8,
      thigh: 5.8, shin: 5.5, upper: 3.95, fore: 3.45,
      ankle: 1.25, hips: 2.45, shoulders: [0.58, 4.95, -1.02]
    }
  },
  {
    id: "anatomy_06_tall", label: "06 Tall", headScale: 1.02, neckWidth: 0.92,
    body: {
      h: 37, heads: 3.08, hip: 12.3, torso: 11.0, neck: 7.0,
      thigh: 6.0, shin: 5.8, upper: 3.8, fore: 3.35,
      ankle: 1.25, hips: 2.2, shoulders: [0.58, 4.65, -1.05]
    }
  },
  {
    id: "anatomy_07_broad", label: "07 Broad", headScale: 1.02, neckWidth: 1.02,
    body: {
      h: 35, heads: 2.92, hip: 13.4, torso: 11.4, neck: 6.6,
      thigh: 5.55, shin: 5.2, upper: 3.95, fore: 3.35,
      ankle: 1.25, hips: 2.7, shoulders: [0.60, 5.0, -1.0]
    }
  },
  {
    id: "anatomy_08_powerful", label: "08 Powerful", headScale: 1.02, neckWidth: 1.04,
    body: {
      h: 36, heads: 3.0, hip: 13.0, torso: 11.2, neck: 6.7,
      thigh: 5.95, shin: 5.5, upper: 4.2, fore: 3.6,
      ankle: 1.25, hips: 2.65, shoulders: [0.65, 5.05, -1.08]
    }
  },
  {
    id: "anatomy_09_compact", label: "09 Compact", headScale: 1.04, neckWidth: 0.96,
    body: {
      h: 34.2, heads: 2.76, hip: 13.1, torso: 11.1, neck: 6.3,
      thigh: 5.15, shin: 4.95, upper: 3.8, fore: 3.25,
      ankle: 1.15, hips: 2.65, shoulders: [0.55, 4.8, -0.98]
    }
  },
  {
    id: "anatomy_10_long_limb", label: "10 Long-limbed", headScale: 1.02, neckWidth: 0.88,
    body: {
      h: 36.8, heads: 3.16, hip: 11.8, torso: 10.4, neck: 6.8,
      thigh: 6.15, shin: 5.9, upper: 3.85, fore: 3.45,
      ankle: 1.25, hips: 2.1, shoulders: [0.55, 4.3, -1.0]
    }
  }
]

const anatomyStyles = TEN_ANATOMY_PROFILES.map(profile => ({
  ...STUDY_BASE_STYLE,
  ...profile,
  palette: STUDY_BASE_PALETTE,
  hair: "long",
  headAccessory: "none",
  top: STUDY_BASE_STYLE.top,
  bottom: STUDY_BASE_STYLE.bottom,
  back: { type: "none" }
}))

for (const style of anatomyStyles) renderStudyCharacter(style)

sheet("merzkava_ten_anatomy_idle_s", TEN_ANATOMY_PROFILES.map(x => x.id + "_idle_s"), { rows: "tag", pad: 2 })
sheet("merzkava_ten_anatomy_walk_s", TEN_ANATOMY_PROFILES.map(x => x.id + "_walk_s"), { rows: "tag", pad: 2 })
sheet("merzkava_ten_anatomy_idle_w", TEN_ANATOMY_PROFILES.map(x => x.id + "_idle_w"), { rows: "tag", pad: 2 })
sheet("merzkava_ten_anatomy_idle_n", TEN_ANATOMY_PROFILES.map(x => x.id + "_idle_n"), { rows: "tag", pad: 2 })
