// Shared PXL wardrobe construction. Style data stays in the five sibling files.
function studyHairField(style) {
  if (style.hair === "none") return undefined

  const cap = sdf.ellipsoid([6.05, 6.15, 5.85]).at(0, -0.5, 1.2)
    .subtract(
      sdf.ellipsoid([5.05, 5.0, 5.1]).at(0, 4.0, -2.25),
      sdf.capsule([-0.9, 4.4, 4.6], [-0.7, -1.5, 5.6], 0.45),
      { smooth: 0.4 }
    ).mat("JjhH")

  const sideLength = style.hair === "short" ? -3.0 :
    style.hair === "bun" ? -5.2 : style.hair === "hood" ? -3.4 : -7.4
  const locks = sdf.union(
    sdf.capsule([-2.4, 3.4, 3.8], [-2.8, 4.9, sideLength], 0.9, 0.5),
    sdf.capsule([2.7, 3.2, 3.7], [3.1, 4.5, sideLength], 0.9, 0.5),
    sdf.capsule([-4.5, 0, 2], [-4.4, 0.3, style.hair === "short" ? -1.6 : -4.6], 1.0, 0.7),
    sdf.capsule([4.5, 0, 2], [4.4, 0.3, style.hair === "short" ? -1.6 : -4.6], 1.0, 0.7),
    { smooth: 0.55 }
  ).mat("JjhH")

  let hair = sdf.union(cap, locks, { smooth: 0.55 })
  if (style.hair === "high-tail") {
    hair = sdf.union(
      hair,
      sdf.ellipsoid([2.0, 2.0, 2.0]).at(0, -5.8, 0).mat("JjhH"),
      sdf.capsule([0.4, -6.8, -1.0], [0.9, -9.5, -5.8], 1.05, 0.6).mat("JjhH"),
      { smooth: 0.45 }
    )
  } else if (style.hair === "bun") {
    hair = sdf.union(
      hair,
      sdf.ellipsoid([2.7, 2.2, 2.5]).at(0, -6.2, 0).mat("JjhH"),
      sdf.capsule([-0.5, -7.6, 1.4], [0.4, -9.0, 3.4], 0.28).mat("gG"),
      { smooth: 0.4 }
    )
  } else if (style.hair === "hood") {
    const hood = sdf.ellipsoid([6.5, 6.7, 6.3]).at(0, -1.0, 1.3)
      .subtract(
        sdf.ellipsoid([5.5, 5.35, 5.5]).at(0, 4.0, -2.0),
        sdf.ellipsoid([4.1, 4.5, 4.5]).at(0, 4.3, -0.4),
        { smooth: 0.35 }
      ).mat("nNcC")
    hair = sdf.union(hair, hood, { smooth: 0.35 })
  } else if (style.hair === "braid") {
    hair = sdf.union(
      hair,
      sdf.capsule([0.2, -4.8, -1.0], [0.4, -8.6, -6.8], 0.95, 0.55).mat("JjhH"),
      sdf.capsule([0.4, -8.6, -6.8], [1.0, -10.0, -8.2], 0.62, 0.3).mat("hH"),
      { smooth: 0.45 }
    )
  }
  return hair
}

function studyHeadAccessoryField(style) {
  if (style.headAccessory === "none" || !style.headAccessory) return undefined
  if (style.headAccessory === "jade-pin") {
    return sdf.union(
      sdf.capsule([-4.3, -0.8, 5.0], [-1.9, -1.0, 7.5], 0.27).mat("gG"),
      sdf.ellipsoid([0.9, 0.65, 1.05]).at(-1.9, -1.0, 7.5).mat("eG")
    )
  }
  if (style.headAccessory === "gold-pin") {
    return sdf.union(
      sdf.capsule([-3.4, -0.8, 5.4], [1.0, -0.9, 6.8], 0.25).mat("gG"),
      sdf.ellipsoid([0.75, 0.65, 0.8]).at(1.0, -0.9, 6.8).mat("eG")
    )
  }
  if (style.headAccessory === "cloth-band") {
    return sdf.capsule([-4.5, 2.5, 5.2], [4.5, 2.5, 5.2], 0.48).mat("gG")
  }
  if (style.headAccessory === "dark-mask") {
    return sdf.ellipsoid([4.8, 4.9, 1.25]).at(0, 2.9, -1.0).mat("nN")
  }
  return undefined
}

function studyHeadField(style) {
  const skull = sdf.ellipsoid([5.7, 5.9, 5.7]).mat("zsSL")
  const fields = [skull]
  const hair = studyHairField(style)
  const accessory = studyHeadAccessoryField(style)
  if (hair) fields.push(hair)
  if (accessory) fields.push(accessory)
  return sdf.union(fields, { smooth: 0.35 })
}

function studyClothPaint(layer) {
  const ramp = layer.out
  const dark = ramp[0]
  const middle = ramp[Math.floor((ramp.length - 1) / 2)]
  const light = ramp[ramp.length - 1]
  return (h, a, outside, pushed = 0) => {
    if (!outside) return layer.lining || dark
    const fold = Math.cos(layer.folds * a + (layer.phase || 0) * (1 - h))
    if (h < 0.055) return layer.hem || dark
    if (pushed > 0.4) return fold > 0.45 ? light : fold < -0.58 ? dark : middle
    return fold > 0.72 ? light : fold < -0.72 ? dark : middle
  }
}

function studyDrape(layer, base) {
  return {
    ...(base === "pelvis" ? { base: "pelvis" } : {}),
    top: (j) => base === "pelvis" ? j.pelvis[2] + 1.35 : j.chest[2] + 0.6,
    len: layer.length,
    out: studyClothPaint(layer),
    in: layer.lining,
    trail: layer.trail,
    push: layer.push,
    keep: layer.openFront === undefined ? () => true : (h, a) => Math.abs(a) > layer.openFront,
    radius: (h, a) => layer.radius + layer.flare * (1 - h) +
      0.28 * (1 - h) * Math.cos(layer.folds * a + (layer.phase || 0))
  }
}

function studyOutfit(style) {
  const top = style.top, bottom = style.bottom
  const drapes = []
  if (top.drape) drapes.push(studyDrape(top.drape, "chest"))
  if (bottom.drape) drapes.push(studyDrape(bottom.drape, "pelvis"))
  const over = (top.over || []).map((layer) => studyDrape(layer, "chest"))

  return {
    r: {
      leg: bottom.leg || [1.7, 1.55, 1.4],
      arm: top.arm || [1.45, 1.3, 1.05],
      body: top.body || [3.9, 4.15],
      hand: 1,
      foot: [1.6, 2.3, 1.1]
    },
    legs: (far) => ({
      tr: far ? (bottom.farTr || bottom.tr) : bottom.tr,
      shin: far ? (bottom.farShin || bottom.shin) : bottom.shin,
      foot: far ? (bottom.farFoot || bottom.foot) : bottom.foot
    }),
    cuff: bottom.cuff === undefined ? 0.48 : bottom.cuff,
    drapes,
    skirt: (h, a, outside) => outside ? top.outer : top.inner,
    body: (h, a, outside) => h < 0.13 ? top.belt : (outside ? top.outer : top.inner),
    over,
    sleeve: (far) => far ? (top.farSleeve || top.sleeve) : top.sleeve,
    fore: (far) => far ? (top.farFore || top.fore) : top.fore,
    hand: (far) => far ? (top.farHand || "zzs") : (top.hand || "zsS"),
    creases: true
  }
}

function studyBackParts(style, j, pose) {
  const back = style.back || { type: "none" }
  if (back.type === "none") return {}
  const point = (forward, side, up) => [
    j.chest[0] + j.f[0] * forward + j.r[0] * side,
    j.chest[1] + j.f[1] * forward + j.r[1] * side,
    j.chest[2] + up
  ]
  if (back.type === "sword") {
    const a = point(-2.6, -1.7, 3.4), b = point(-2.9, 1.8, -11.0)
    const h0 = point(-2.7, -2.3, 4.2), h1 = point(-2.6, -1.1, 2.2)
    return { back_item: [j.limb(a, b, 0.72, 0.62, back.blade), j.limb(h0, h1, 0.72, 0.55, back.hilt)] }
  }
  if (back.type === "twin-blades") {
    const l0 = point(-2.7, -3.0, 3.0), l1 = point(-2.8, -0.9, -9.0)
    const r0 = point(-2.7, 3.0, 3.0), r1 = point(-2.8, 0.9, -9.0)
    return { back_item: [j.limb(l0, l1, 0.62, 0.5, back.blade), j.limb(r0, r1, 0.62, 0.5, back.blade)] }
  }
  if (back.type === "scroll") {
    const center = point(-2.3, 0, -2.2)
    return { back_item: sdf.ellipsoid([2.4, 1.25, 4.2]).rotate(-j.heading, "z").at(center).mat(back.material) }
  }
  if (back.type === "pack") {
    const center = point(-2.45, 0, -2.0)
    const pack = sdf.ellipsoid([3.0, 1.5, 3.5]).rotate(-j.heading, "z").at(center).mat(back.material)
    const strapA = j.limb(point(-1.8, -2.2, 3.5), point(-1.8, -1.3, -4.0), 0.36, 0.36, back.strap)
    const strapB = j.limb(point(-1.8, 2.2, 3.5), point(-1.8, 1.3, -4.0), 0.36, 0.36, back.strap)
    return { back_item: [pack, strapA, strapB] }
  }
  if (back.type === "ribbons") {
    const lag = (pose.trail || 0) * 0.45
    const sway = (pose.sway || 0) * 1.15
    const a0 = point(-2.1, -1.4, 2.3), a1 = point(-2.1 - lag, -2.4 + sway, -10.8)
    const b0 = point(-2.1, 1.4, 2.3), b1 = point(-2.1 - lag, 2.4 - sway, -10.8)
    return { back_item: [j.limb(a0, a1, 0.68, 0.35, back.material), j.limb(b0, b1, 0.68, 0.35, back.material)] }
  }
  if (back.type === "standard") {
    const poleA = point(-2.6, 1.8, -7.0), poleB = point(-2.6, 1.8, 9.0)
    const clothCenter = point(-2.9, 3.2, 6.4)
    return {
      back_item: [
        j.limb(poleA, poleB, 0.45, 0.45, back.pole),
        sdf.ellipsoid([2.8, 0.55, 4.0]).rotate(-j.heading, "z").at(clothCenter).mat(back.material)
      ]
    }
  }
  return {}
}

function studyParts(style) {
  const painter = dress(studyOutfit(style))
  return (j, pose) => {
    const P = painter(j, pose)
    const neckEnd = [j.head[0], j.head[1], j.head[2] - 4.45]
    return {
      ...P,
      neck: j.limb(j.chest, neckEnd, 1.28, 1.16, "zsS"),
      ...studyBackParts(style, j, pose)
    }
  }
}

function studyWalk(i, yaw) {
  const g = gait(i / 8, { heading: 180 - yaw })
  const phase = (2 * Math.PI * i) / 8
  const side = g.view === "profile" || g.view === "diagonal"
  const feet = g.feet.map(([forward], k) => [forward, k ? 2.1 : -2.1])
  const lift = g.feet.map(([, up]) => up)
  const hands = g.hands.map(([forward, up], k) => [forward, side ? (k ? 0.8 - 0.6 * g.a : -0.8 + 0.6 * g.a) : k ? 1 : -1, -7 + up])
  return side
    ? { feet, lift, down: g.bob, lean: 4, trail: 1 + 0.3 * Math.abs(Math.sin(phase - 0.8)), sway: Math.sin(phase - 0.8) * (1 - g.a), hands }
    : { feet, lift, down: g.bob, lean: 2, trail: 0.4, sway: Math.sin(phase), hands }
}

function studyIdle(i) {
  return {
    feet: [[0, -2.35], [0, 2.35]], lift: [0, 0], down: [0, 1, 1, 0][i],
    lean: 1, trail: 0.15, sway: 0, hands: [[0, -1, -7], [0, 1, -7]]
  }
}

function renderStudyCharacter(style) {
  pal(style.palette)
  const headName = "_study_" + style.id + "_head"
  views(headName, studyHeadField(style), {
    ink: "k", jaw: ["D", "zsSL"], surface: STUDY_HEAD_LIGHT,
    anchor: STUDY_HEAD_ANCHOR, retouch: STUDY_FACE
  })
  const moves = {
    idle: { frames: 4, ms: 260, dirs: STUDY_DIRS, pose: (i) => studyIdle(i) },
    walk: { frames: 8, ms: 110, dirs: STUDY_DIRS, pose: (i, heading) => studyWalk(i, 180 - heading) }
  }
  rig3d(style.id, {
    body: { ...STUDY_BASE_BODY },
    w: STUDY_FRAME.w, h: STUDY_FRAME.h, pivot: STUDY_PIVOT,
    ink: "k", inner: "dark", surface: { soft: 0.55 },
    n: 8, head: headName, parts: studyParts(style), moves, blocks: style.id === "base"
  })
}
