// Hand-drawn vector icons (all original): minimal shapes, strong colour, East-Asian symbols (gourd, pagoda roof, gate, scroll, luopan compass, taiji, bagua, talisman, cloud, crane, lotus, ...).
// uiIcon(name)            -> 24x24 svg for the HUD buttons
// skillIcon(motif, pal)   -> 48x48 medallion svg: every skill picks its own motif + palette, so no two icons look alike
const W = "#fff4dc", K = "#16121f";
export const PAL = {
  crimson: ["#ff5a4a", "#ffd2a8"], gold: ["#ffc247", "#fff1b8"], jade: ["#3fe0a0", "#c8ffe8"], azure: ["#4ea8ff", "#d6ecff"], violet: ["#a97bff", "#eadcff"], rose: ["#ff7aa8", "#ffdbe8"],
  white: ["#eef3ff", "#9fb4d9"], orange: ["#ff8a3d", "#ffe0b0"], teal: ["#2fd4d4", "#ccffff"], ember: ["#ff5f2a", "#ffd36a"], ice: ["#8fe6ff", "#ffffff"], ink: ["#d3d9ea", "#7a86a8"], lime: ["#9be85a", "#f0ffc8"],
};
const rot = (n, cx, cy, f) => Array.from({ length: n }, (_, i) => `<g transform="rotate(${(360 / n) * i} ${cx} ${cy})">${f(i)}</g>`).join("");
// motifs draw inside a 48x48 box, centred on (24,24); a = main colour, b = light accent
const M = {
  vslash: (a, b) => `<path d="M10 11 24 37 38 11" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 12 24 28 32 12" fill="none" stroke="${b}" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="39" r="2.2" fill="${W}"/>`,
  crescent: (a, b) => `<path d="M31 8a16 16 0 1 0 0 32 12 12 0 1 1 0-32Z" fill="${a}"/><path d="M12 36 37 13" stroke="${b}" stroke-width="2.6" stroke-linecap="round"/>`,
  gourd: (a, b) => `<circle cx="24" cy="32" r="9.5" fill="${a}"/><circle cx="24" cy="19" r="6.5" fill="${a}"/><rect x="22" y="7" width="4" height="6" rx="1.5" fill="${b}"/><path d="M24 27v10M19 32h10" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`,
  mountain: (a, b) => `<path d="M5 37 18 15l6 9 7-14 12 27Z" fill="${a}"/><path d="m24 24 7-14 3 6-5 6-3-3Z" fill="${b}"/><circle cx="36" cy="12" r="3" fill="${b}"/>`,
  dash: (a, b) => `<path d="M7 31h19M5 23h16M10 15h12" stroke="${b}" stroke-width="2.6" stroke-linecap="round"/><path d="m26 11 16 13-16 13 4-13Z" fill="${a}"/>`,
  bolt: (a, b) => `<path d="M28 5 12 27h11l-4 16 18-24H26Z" fill="${a}"/><path d="M28 5 12 27h11" fill="none" stroke="${b}" stroke-width="1.8" stroke-linejoin="round"/>`,
  lotus: (a, b) => `${rot(5, 24, 27, () => `<ellipse cx="24" cy="15" rx="5.2" ry="10" fill="${a}" opacity=".92"/>`)}<circle cx="24" cy="27" r="5" fill="${b}"/>`,
  flame: (a, b) => `<path d="M24 5c8 10 15 15 15 25a15 15 0 0 1-30 0C9 22 16 16 24 5Z" fill="${a}"/><path d="M24 21c4 6 6 8 6 12a6 6 0 0 1-12 0c0-4 2-6 6-12Z" fill="${b}"/>`,
  sun: (a, b) => `<circle cx="24" cy="24" r="8.5" fill="${a}"/><g stroke="${b}" stroke-width="2.8" stroke-linecap="round">${rot(8, 24, 24, () => `<path d="M24 5v6"/>`)}</g>`,
  phoenix: (a, b) => `<path d="M24 39C13 35 7 25 5 11c9 4 15 8 19 17 4-9 10-13 19-17-2 14-8 24-19 28Z" fill="${a}"/><path d="M24 28c-2-7-2-13 0-20 2 7 2 13 0 20Z" fill="${b}"/>`,
  claws: (a, b) => `<g fill="none" stroke="${a}" stroke-width="4.2" stroke-linecap="round"><path d="M12 7q6 17-1 34"/><path d="M23 6q6 18-1 36"/><path d="M34 7q6 17-1 34"/></g><path d="M23 6q6 18-1 36" fill="none" stroke="${b}" stroke-width="1.4"/>`,
  rain: (a, b) => `<g stroke="${a}" stroke-width="3" stroke-linecap="round"><path d="M12 7v21M24 12v26M36 7v21"/></g><g fill="${b}"><path d="m7.5 27 4.5 9 4.5-9ZM19.5 37l4.5 9 4.5-9ZM31.5 27l4.5 9 4.5-9Z" transform="translate(0 -3)"/></g>`,
  void: (a, b) => `<circle cx="24" cy="24" r="15" fill="${K}" stroke="${a}" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="${a}" opacity=".55"/><path d="M9 39 39 9" stroke="${b}" stroke-width="3.2" stroke-linecap="round"/>`,
  divide: (a, b) => `<path d="m24 4 4.5 23h-9Z" fill="${W}"/><rect x="15" y="27" width="18" height="3.5" rx="1.5" fill="${a}"/><rect x="22" y="30.5" width="4" height="11" rx="1.5" fill="${b}"/><path d="M5 20h11M32 20h11" stroke="${b}" stroke-width="2.4" stroke-linecap="round"/>`,
  shuriken: (a, b) => `<path d="m24 4 4 16 16 4-16 4-4 16-4-16L4 24l16-4Z" fill="${a}"/><circle cx="24" cy="24" r="4" fill="${K}" stroke="${b}" stroke-width="1.8"/>`,
  needles: (a, b) => `<g stroke="${a}" stroke-width="2.6" stroke-linecap="round"><path d="M10 39 36 9M17 41 41 19M6 31 29 7"/></g><circle cx="10" cy="39" r="2.4" fill="${b}"/><circle cx="17" cy="41" r="2.4" fill="${b}"/><circle cx="6" cy="31" r="2.4" fill="${b}"/>`,
  staff: (a, b) => `<path d="M11 40 34 11" stroke="${a}" stroke-width="4.4" stroke-linecap="round"/><circle cx="35" cy="10" r="6" fill="none" stroke="${b}" stroke-width="2.6"/><circle cx="35" cy="10" r="1.8" fill="${b}"/><path d="m13 36 4 3M18 29l4 3" stroke="${b}" stroke-width="2.4" stroke-linecap="round"/>`,
  fist: (a, b) => `<path d="M10 23q0-9 9-9h14q7 0 7 9v8q0 10-13 10h-5q-12 0-12-11Z" fill="${a}"/><path d="M19 14v11M27 14v11M34 17v8" stroke="${K}" stroke-width="2" stroke-linecap="round"/><rect x="12" y="35" width="24" height="5" rx="2" fill="${b}"/>`,
  saber: (a, b) => `<path d="M10 39C14 21 25 10 41 8c-8 5-14 15-18 28Z" fill="${a}"/><path d="m9 40 5-4M16 33l7 4" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
  heavy: (a, b) => `<path d="m24 4 9 8-3 18H18l-3-18Z" fill="${a}"/><path d="M24 9v19" stroke="${b}" stroke-width="1.8"/><rect x="11" y="30" width="26" height="4.5" rx="1.5" fill="${b}"/><rect x="21" y="34" width="6" height="9" rx="1.5" fill="${a}"/>`,
  twin: (a, b) => `<path d="M9 8 33 32M39 8 15 32" stroke="${a}" stroke-width="4.4" stroke-linecap="round"/><path d="m31 30 8 8M17 30l-8 8" stroke="${b}" stroke-width="4.4" stroke-linecap="round"/>`,
  spear: (a, b) => `<path d="m24 3 5.5 15h-11Z" fill="${a}"/><rect x="23" y="18" width="2" height="26" rx="1" fill="${b}"/><path d="M18.500 20Q24 28 29.500 20V27Q24 35 18.500 27Z" fill="#e0443a"/>`,
  taiji: (a, b) => `<circle cx="24" cy="24" r="16" fill="${b}"/><path d="M24 8a16 16 0 0 1 0 32 8 8 0 0 1 0-16 8 8 0 0 0 0-16Z" fill="${a}"/><circle cx="24" cy="16" r="2.6" fill="${b}"/><circle cx="24" cy="32" r="2.6" fill="${a}"/>`,
  bagua: (a, b) => `<path d="m24 5 13.400 5.600L43 24l-5.600 13.400L24 43 10.600 37.400 5 24l5.600-13.400Z" fill="none" stroke="${a}" stroke-width="2.6"/><circle cx="24" cy="24" r="8" fill="${b}"/><path d="M24 16a8 8 0 0 1 0 16 4 4 0 0 1 0-8 4 4 0 0 0 0-8Z" fill="${a}"/>`,
  talisman: (a, b) => `<rect x="14" y="5" width="20" height="38" rx="2.500" fill="#f3e2a8"/><path d="M19 11h10M24 11v11M19 28h10M19 34h10" stroke="${a}" stroke-width="2.600" stroke-linecap="round"/><circle cx="24" cy="39" r="1.600" fill="${a}"/>`,
  bell: (a, b) => `<path d="M24 6c7 0 10 6 10 16l4 12H10l4-12c0-10 3-16 10-16Z" fill="${a}"/><circle cx="24" cy="38" r="3.200" fill="${b}"/><rect x="22" y="3" width="4" height="5" rx="1.500" fill="${b}"/>`,
  fan: (a, b) => `<path d="M24 41 6 19a28 28 0 0 1 36 0Z" fill="${a}"/><g stroke="${b}" stroke-width="1.600" stroke-linecap="round"><path d="M24 41 11 17M24 41V12M24 41 37 17"/></g>`,
  cloud: (a, b) => `<path d="M9 33a6 6 0 0 1 5-9 9 9 0 0 1 17-2 7 7 0 0 1 8 7 5 5 0 0 1-2 4Z" fill="${a}"/><path d="M15 38q9-3 18 0" stroke="${b}" stroke-width="2.600" stroke-linecap="round" fill="none"/>`,
  eclipse: (a, b) => `<circle cx="24" cy="24" r="15" fill="${a}"/><circle cx="30" cy="21" r="13" fill="${K}"/><circle cx="24" cy="24" r="16.500" fill="none" stroke="${b}" stroke-width="1.600"/>`,
  dragon: (a, b) => `<path d="M9 38C7 24 24 30 25 19c1-7-6-8-7-3" fill="none" stroke="${a}" stroke-width="5.500" stroke-linecap="round"/><path d="m28 13 11-7-3 12Z" fill="${b}"/><circle cx="30" cy="15" r="1.500" fill="${K}"/>`,
  crane: (a, b) => `<path d="M6 35c10-3 16-9 20-19l3-10 3 11c4 7 8 14 11 19-9-4-15-3-20 4Z" fill="${a}"/><path d="m29 6 7-2" stroke="${b}" stroke-width="2.600" stroke-linecap="round"/>`,
  wave: (a, b) => `<g fill="none" stroke-width="2.800" stroke-linecap="round"><path d="M5 36a9.500 9.500 0 0 1 19 0M24 36a9.500 9.500 0 0 1 19 0M10 36a4.500 4.500 0 0 1 9 0M29 36a4.500 4.500 0 0 1 9 0" stroke="${a}"/><path d="M14 24a9.500 9.500 0 0 1 19 0M19 24a4.500 4.500 0 0 1 9 0" stroke="${b}"/></g>`,
  blossom: (a, b) => `${rot(5, 24, 24, () => `<circle cx="24" cy="13" r="7.500" fill="${a}"/>`)}<circle cx="24" cy="24" r="4.500" fill="${b}"/>`,
  spirit: (a, b) => `<path d="M26 4c6 9 14 15 12 25-2 9-9 14-17 13C11 40 8 31 14 25c2 2 4 2 4-2 0-6 6-11 8-19Z" fill="${a}"/><path d="M24 22c3 5 6 8 4 12-2 4-8 4-8-1 0-4 3-7 4-11Z" fill="${b}"/>`,
  snow: (a, b) => `<g stroke="${a}" stroke-width="3" stroke-linecap="round">${rot(6, 24, 24, () => `<path d="M24 24V6M24 13l-5-4M24 13l5-4"/>`)}</g><circle cx="24" cy="24" r="3" fill="${b}"/>`,
  coin: (a, b) => `<circle cx="24" cy="24" r="16" fill="${a}"/><rect x="18" y="18" width="12" height="12" rx="1.500" fill="${K}"/><circle cx="24" cy="24" r="16" fill="none" stroke="${b}" stroke-width="1.600"/>`,
  seal: (a, b) => `<rect x="9" y="9" width="30" height="30" rx="5" fill="${a}"/><path d="M17 17h14M17 24h14M24 17v16M17 31h14" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`,
  tiger: (a, b) => `<path d="M8 12 16 18h16l8-6 1 14c0 9-8 15-17 15S7 35 7 26Z" fill="${a}"/><path d="M16 26h4M28 26h4M22 33l2 2 2-2" stroke="${K}" stroke-width="2.600" stroke-linecap="round"/><path d="M24 14v6M17 15v3M31 15v3" stroke="${b}" stroke-width="2.200" stroke-linecap="round"/>`,
  skull: (a, b) => `<path d="M24 6c9 0 15 6 15 14 0 5-3 8-6 10v7H15v-7c-3-2-6-5-6-10 0-8 6-14 15-14Z" fill="${a}"/><circle cx="17.500" cy="21" r="3.600" fill="${K}"/><circle cx="30.500" cy="21" r="3.600" fill="${K}"/><path d="M24 27v4M20 38v-4M28 38v-4" stroke="${K}" stroke-width="2" stroke-linecap="round"/>`,
};
export const MOTIFS = Object.keys(M);
/** medallion: dim low-opacity disc, thin coloured ring, the motif in strong colour */
export function skillIcon(motif, pal = "azure", size = 44) {
  const [a, b] = PAL[pal] || PAL.azure, id = "g" + Math.abs((motif + pal).split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7));
  return `<svg class="sk-ic" viewBox="0 0 48 48" width="${size}" height="${size}"><defs><radialGradient id="${id}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${a}" stop-opacity=".30"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="23" fill="rgba(12,10,20,.55)"/><circle cx="24" cy="24" r="23" fill="url(#${id})"/><circle cx="24" cy="24" r="22.2" fill="none" stroke="${a}" stroke-opacity=".75" stroke-width="1.3"/><g transform="translate(24 24) scale(.74) translate(-24 -24)">${(M[motif] || M.taiji)(a, b)}</g></svg>`;
}
// ---------------------------------------------------------------- HUD icons (24x24, one strong colour each)
const U = {
  bag: '<path d="M8 8c-1-3 1-5 4-5s5 2 4 5" fill="none" stroke="#ffb347" stroke-width="1.8" stroke-linecap="round"/><path d="M7 8h10c3 3 4 7 3 10-1 3-4 3-8 3s-7 0-8-3c-1-3 0-7 3-10Z" fill="#ffb347"/><path d="M9 8h6" stroke="#16121f" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14.500" r="2" fill="#16121f" opacity=".7"/>',
  build: '<path d="M2 11q5 0 7-5l3-3 3 3q2 5 7 5-4 1-5 3H7q-1-2-5-3Z" fill="#35d0c0"/><path d="M6 15h12v6H6Z" fill="#35d0c0" opacity=".55"/><path d="M10 21v-4h4v4" fill="#16121f" opacity=".8"/>',
  home: '<path d="M2 6q10 1 20 0v2.500Q12 9.500 2 8.500Z" fill="#ff5a4a"/><path d="M4.500 11h15" stroke="#ff5a4a" stroke-width="2"/><path d="M6.500 8v13M17.500 8v13" stroke="#ff5a4a" stroke-width="2.600"/><path d="M12 11v3" stroke="#ff5a4a" stroke-width="2"/>',
  quest: '<path d="M6 4h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a3 3 0 0 1-3-3V6a2 2 0 0 1 1-2Z" fill="#ffd166"/><path d="M8 9h8M8 13h6" stroke="#16121f" stroke-width="1.700" stroke-linecap="round"/><circle cx="16" cy="17" r="2.600" fill="#e0443a"/>',
  menu: '<path d="M4 15a4 4 0 0 1 3-6 6 6 0 0 1 11-1 4.500 4.500 0 0 1 2 8Z" fill="#b08cff"/><path d="M7 19q5-2 10 0" stroke="#b08cff" stroke-width="1.800" stroke-linecap="round" fill="none"/>',
  hunt: '<path d="M4 4 20 20M20 4 4 20" stroke="#ff5a4a" stroke-width="2.600" stroke-linecap="round"/><path d="m16 16 4 4M8 16l-4 4" stroke="#ffd2a8" stroke-width="2.600" stroke-linecap="round"/>',
  map: '<circle cx="12" cy="12" r="9" fill="none" stroke="#3fe0a0" stroke-width="1.800"/><path d="m16.500 7.500-3 6-6 3 3-6Z" fill="#3fe0a0"/><circle cx="12" cy="12" r="1.500" fill="#16121f"/>',
  skills: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" fill="#6f8cff"/><path d="M5 17a3 3 0 0 1 3-3h11" stroke="#16121f" stroke-width="1.400" fill="none"/><circle cx="12.500" cy="9" r="2.800" fill="#fff4dc"/><path d="M12.500 6.200a2.800 2.800 0 0 1 0 5.600 1.400 1.400 0 0 1 0-2.800 1.400 1.400 0 0 0 0-2.800Z" fill="#16121f"/>',
  meridian: '<circle cx="12" cy="4.500" r="2.200" fill="#38d9f5"/><circle cx="5" cy="14" r="2.200" fill="#38d9f5"/><circle cx="19" cy="14" r="2.200" fill="#38d9f5"/><circle cx="12" cy="20" r="2.200" fill="#38d9f5"/><circle cx="12" cy="12" r="2.200" fill="#fff4dc"/><path d="M12 6.500v3.300M6.500 12.500l3.500-.5M17.500 12.500l-3.500-.5M12 14.200v3.600" stroke="#38d9f5" stroke-width="1.600" stroke-linecap="round"/>',
  class: '<path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6Z" fill="#ff8a3d"/><path d="m12 8 1.600 3.300 3.600.5-2.600 2.500.6 3.600L12 16l-3.200 1.900.6-3.600L6.800 11.800l3.600-.5Z" fill="#16121f" opacity=".75"/>',
  taiji: '<circle cx="12" cy="12" r="9" fill="#fff4dc"/><path d="M12 3a9 9 0 0 1 0 18 4.500 4.500 0 0 1 0-9 4.500 4.500 0 0 0 0-9Z" fill="#16121f"/><circle cx="12" cy="7.500" r="1.400" fill="#fff4dc"/><circle cx="12" cy="16.500" r="1.400" fill="#16121f"/>',
  aura: '<ellipse cx="12" cy="15" rx="9.500" ry="4.600" fill="none" stroke="#c47bff" stroke-width="1.700"/><ellipse cx="12" cy="15" rx="5.800" ry="2.800" fill="none" stroke="#ffd166" stroke-width="1.700"/><path d="M12 3c1.500 2.500 3.400 4 3.400 6.500a3.400 3.400 0 0 1-6.800 0C8.600 7 10.500 5.500 12 3Z" fill="#ff6a4a"/><path d="M12 7c.8 1.300 1.700 2 1.700 3.200a1.700 1.700 0 0 1-3.400 0C10.300 9 11.200 8.300 12 7Z" fill="#ffe9b0"/>',
  hp: '<path d="M12 2.500c3.200 4.200 6 7 6 11a6 6 0 0 1-12 0c0-4 2.800-6.800 6-11Z" fill="#ff5a5a"/><path d="M12 10.500v6M9 13.500h6" stroke="#fff4f0" stroke-width="2" stroke-linecap="round"/>',
  qi: '<path d="M12 2c2 3.500 4.500 5.500 4.500 9a4.500 4.500 0 0 1-9 0C7.500 7.500 10 5.500 12 2Z" fill="#4aa3ff"/><path d="M4.500 14.500c2.800.2 5 1.800 7.500 5.700 2.500-3.900 4.700-5.500 7.500-5.700-1 4.400-4.100 6.500-7.500 6.500s-6.500-2.100-7.500-6.500Z" fill="#8fd8ff"/>',
  meal: '<path d="M3 11h18a9 9 0 0 1-18 0Z" fill="#ffb02e"/><path d="M8 7.500c-1.200-1.600 1.200-2.800 0-4.500M12 7.500c-1.200-1.600 1.200-2.800 0-4.500M16 7.500c-1.200-1.600 1.200-2.800 0-4.500" stroke="#ffe3a0" stroke-width="1.500" fill="none" stroke-linecap="round"/><path d="M8 21h8" stroke="#ffb02e" stroke-width="2" stroke-linecap="round"/>',
  draw: '<path d="M6 10h10l1.500 10h-13Z" fill="#ffd23f"/><path d="M8.500 10V8.500a2.500 2.500 0 0 1 5 0V10" stroke="#ffd23f" stroke-width="1.700" fill="none"/><path d="M15.500 3.800a6.200 6.200 0 0 1 4.700 5" stroke="#9dff6a" stroke-width="1.900" fill="none" stroke-linecap="round"/><path d="m21.200 4.600-1 4.600-4.100-1.700Z" fill="#9dff6a"/>',
  autocfg: '<circle cx="12" cy="12" r="7.500" fill="none" stroke="#9dff6a" stroke-width="3.200" stroke-dasharray="3.300 2.250"/><circle cx="12" cy="12" r="5.200" fill="#9dff6a"/><path d="M12 8.200 15.800 12 12 15.800 8.200 12Z" fill="#16121f"/>',
  plus: '<path d="M12 6v12M6 12h12" stroke="#ffffff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>',
};
export const uiIcon = (name) => `<svg viewBox="0 0 24 24" class="ui-ic">${U[name] || ""}</svg>`;
