import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "web/public/game-assets/hd");
const charOut = resolve(out, "characters");
const objectOut = resolve(out, "objects");
const previewOut = resolve(out, "previews");
[charOut, objectOut, previewOut].forEach(path => mkdirSync(path, { recursive: true }));

const STYLES = [
  { id: "chibi", coat: "#b86f4f", trim: "#e7c27e", dark: "#49333a", hair: "#24252d", inner: "#f0dfc2", shape: 0 },
  { id: "classic", coat: "#647b67", trim: "#c8aa6d", dark: "#263d38", hair: "#252b31", inner: "#e7dfc8", shape: 1 },
  { id: "slim", coat: "#557b91", trim: "#d5c38e", dark: "#29465a", hair: "#34303a", inner: "#e5e3d7", shape: 2 },
  { id: "ornate", coat: "#9a5b65", trim: "#e0bd76", dark: "#482e42", hair: "#28242d", inner: "#f2dfc0", shape: 3 },
  { id: "painterly", coat: "#a47a4e", trim: "#e1c28b", dark: "#453a34", hair: "#292a29", inner: "#e8ddc8", shape: 4 }
];
const DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const moves = ["idle", "walk"];
const defs = '<defs>' +
  '<linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".23"/><stop offset=".42" stop-color="#ffffff" stop-opacity=".02"/><stop offset="1" stop-color="#000000" stop-opacity=".22"/></linearGradient>' +
  '<linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7d9b8"/><stop offset="1" stop-color="#bd856c"/></linearGradient>' +
  '<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0b5"/><stop offset=".5" stop-color="#c8a05d"/><stop offset="1" stop-color="#795438"/></linearGradient>' +
  '<linearGradient id="hair" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#55505a"/><stop offset=".5" stop-color="#24252d"/><stop offset="1" stop-color="#11151b"/></linearGradient>' +
  '<filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>' +
  '</defs>';

function characterFrame(style, dir, move, frame) {
  const front = ["s", "se", "sw"].includes(dir);
  const back = ["n", "ne", "nw"].includes(dir);
  const side = !front && !back;
  const left = ["w", "nw", "sw"].includes(dir);
  const walking = move === "walk";
  const phase = frame / 12 * Math.PI * 2;
  const stride = walking ? Math.sin(phase) : Math.sin(phase) * 0.18;
  const bob = walking ? Math.abs(Math.sin(phase)) * 2.2 : Math.sin(phase) * 1.05;
  const sway = Math.sin(phase) * (walking ? 1.8 : 1.1);
  const legA = Math.round(stride * 5);
  const legB = -legA;
  const armA = -stride * 5;
  const armB = stride * 5;
  const center = 64;
  const robeBottom = style.shape === 0 ? 137 : style.shape === 2 ? 140 : 143;
  const robeWide = style.shape === 3 ? 25 : style.shape === 2 ? 17 : style.shape === 4 ? 23 : 20;
  const headScale = style.shape === 0 ? 1.13 : style.shape === 2 ? 0.91 : style.shape === 3 ? 1.03 : 1;
  const face = front
    ? '<path d="M53 33 Q64 28 75 33 L75 47 Q73 57 64 59 Q55 57 53 47Z" fill="url(#skin)" stroke="#775047" stroke-width="1.1"/>' +
      '<path d="M57 44 Q60 42 62 44 M67 44 Q70 42 72 44" fill="none" stroke="#4c3330" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M61 51 Q64 53 67 51" fill="none" stroke="#9b5b55" stroke-width="1.3" stroke-linecap="round"/>'
    : side
      ? '<path d="M58 33 Q68 28 75 36 L74 49 Q70 58 62 56 Q58 51 58 44Z" fill="url(#skin)" stroke="#775047" stroke-width="1.1"/>' +
        '<path d="M68 44 l5 1" stroke="#4c3330" stroke-width="1.8" stroke-linecap="round"/>'
      : '<path d="M51 35 Q64 28 77 35 L75 50 Q64 59 53 50Z" fill="#20232a" stroke="#171a20" stroke-width="1.2"/>';
  const rearHair = '<path d="M48 42 Q43 22 57 15 Q73 9 81 25 Q85 38 78 52 L74 68 Q69 62 67 53 Q58 59 51 52Z" fill="url(#hair)" stroke="#11151b" stroke-width="1.5"/>' +
    '<path d="M49 32 Q51 18 64 17 Q75 17 79 28" fill="none" stroke="#77717c" stroke-opacity=".42" stroke-width="2"/>';
  const bangs = back ? "" : side
    ? '<path d="M52 35 Q48 20 62 17 Q78 17 79 32 Q73 28 68 32 Q62 38 55 38Z" fill="#25252e" stroke="#11151b" stroke-width="1.2"/>'
    : '<path d="M50 36 Q47 19 61 16 Q77 14 80 30 Q73 25 68 31 Q61 35 58 39Z" fill="#25252e" stroke="#11151b" stroke-width="1.2"/>' +
      '<path d="M54 28 Q59 20 69 22" fill="none" stroke="#77717c" stroke-opacity=".45" stroke-width="1.8"/>';
  const legLeftX = left ? 55 : 58;
  const legRightX = left ? 72 : 69;
  const feet = '<g transform="translate(0 ' + bob + ')">' +
    '<ellipse cx="64" cy="145" rx="22" ry="4.5" fill="#07100d" opacity=".38" filter="url(#softShadow)"/>' +
    '<path d="M' + (legLeftX + legA * .36) + ' 121 l10 0 1 18 -8 4 -5 -4Z" fill="#342d2b" stroke="#171a1b" stroke-width="1.2"/>' +
    '<path d="M' + (legRightX + legB * .36) + ' 121 l10 0 3 17 -8 5 -7 -4Z" fill="#342d2b" stroke="#171a1b" stroke-width="1.2"/>' +
    '<path d="M' + (legLeftX - 2 + legA) + ' 140 q7 -3 14 1 l2 5 -17 1Z" fill="#6b493b" stroke="#2a2626" stroke-width="1.2"/>' +
    '<path d="M' + (legRightX - 2 + legB) + ' 140 q7 -3 14 1 l3 5 -18 1Z" fill="#6b493b" stroke="#2a2626" stroke-width="1.2"/>' +
    '</g>';
  const robePath = style.shape === 2
    ? 'M48 65 Q64 58 80 66 L83 ' + robeBottom + ' Q64 ' + (robeBottom + 4) + ' 45 ' + robeBottom + 'Z'
    : style.shape === 3
      ? 'M43 67 Q64 56 85 67 L91 ' + robeBottom + ' Q64 ' + (robeBottom + 5) + ' 37 ' + robeBottom + 'Z'
      : style.shape === 4
        ? 'M43 67 Q62 57 83 66 L88 127 L79 ' + robeBottom + ' L39 ' + (robeBottom - 1) + 'Z'
        : 'M45 66 Q64 57 83 66 L' + (64 + robeWide) + ' ' + robeBottom + ' Q64 ' + (robeBottom + 5) + ' ' + (64 - robeWide) + ' ' + robeBottom + 'Z';
  const sleeves = '<g transform="translate(' + armA + ' ' + bob + ')"><path d="M48 69 Q39 70 35 87 L28 105 Q34 112 42 109 L54 86Z" fill="' + style.coat + '" stroke="' + style.dark + '" stroke-width="1.8"/><path d="M30 103 q7 4 13 0 l-2 7 q-8 4 -13 -1Z" fill="' + style.trim + '"/></g>' +
    '<g transform="translate(' + armB + ' ' + bob + ')"><path d="M80 69 Q89 70 93 87 L100 105 Q94 112 86 109 L74 86Z" fill="' + style.coat + '" stroke="' + style.dark + '" stroke-width="1.8"/><path d="M87 103 q7 4 13 0 l3 6 q-8 5 -13 1Z" fill="' + style.trim + '"/></g>';
  const collar = '<path d="M53 64 L64 79 L75 64 L72 84 L64 91 L56 84Z" fill="' + style.inner + '" stroke="' + style.dark + '" stroke-width="1.4"/>' +
    '<path d="M53 65 L64 79 L59 84 L48 69Z" fill="' + style.trim + '" opacity=".92"/>' +
    '<path d="M75 65 L64 79 L69 84 L80 69Z" fill="' + style.trim + '" opacity=".92"/>';
  const embroidery = '<path d="M64 91 L64 129 M53 101 Q64 106 75 101 M54 116 Q64 121 74 116" fill="none" stroke="' + style.trim + '" stroke-opacity=".72" stroke-width="1.35"/>' +
    '<path d="M58 96 l6 4 6 -4 M58 121 l6 4 6 -4" fill="none" stroke="#f4dfad" stroke-opacity=".44" stroke-width="1"/>';
  const ornament = style.shape === 3
    ? '<path d="M78 20 q10 -4 9 6 q-1 7 -8 5" fill="none" stroke="url(#metal)" stroke-width="3"/><circle cx="83" cy="29" r="3" fill="#e8c77f"/>'
    : style.shape === 4
      ? '<path d="M77 25 q8 15 2 26" fill="none" stroke="' + style.trim + '" stroke-width="2.5"/><circle cx="79" cy="51" r="2.4" fill="url(#metal)"/>'
      : '<path d="M76 22 q7 0 6 8" fill="none" stroke="url(#metal)" stroke-width="2"/>';
  const hairTail = style.shape === 2
    ? '<path d="M76 37 Q91 52 80 75 Q78 81 71 86 Q81 57 69 48Z" fill="#24252d" stroke="#11151b" stroke-width="1"/>'
    : style.shape === 4
      ? '<path d="M76 36 Q91 49 84 69 L78 82 Q81 57 68 47Z" fill="#24252d" stroke="#11151b" stroke-width="1"/>'
      : '<path d="M77 38 Q86 53 78 68 L72 77 Q75 53 67 47Z" fill="#24252d" stroke="#11151b" stroke-width="1"/>';
  let art = '<g transform="translate(0 ' + (-bob) + ')">';
  if (left) art = '<g transform="translate(128 0) scale(-1 1)"><g transform="translate(0 ' + (-bob) + ')">';
  art += '<ellipse cx="64" cy="148" rx="24" ry="5" fill="#050a08" opacity=".36"/>';
  art += '<g>' + (back ? rearHair : hairTail) + '</g>';
  art += '<g transform="translate(0 ' + (walking ? 0 : sway * .18) + ')">' + feet + '</g>';
  art += '<g>' + sleeves + '</g>';
  art += '<path d="' + robePath + '" fill="' + style.coat + '" stroke="' + style.dark + '" stroke-width="2" stroke-linejoin="round"/>';
  art += '<path d="M' + (64 - robeWide + 4) + ' 104 Q64 112 ' + (64 + robeWide - 4) + ' 104 L' + (64 + robeWide - 1) + ' ' + (robeBottom - 7) + ' Q64 ' + (robeBottom + 1) + ' ' + (64 - robeWide + 1) + ' ' + (robeBottom - 7) + 'Z" fill="url(#cloth)" opacity=".7"/>';
  art += '<path d="M' + (64 - robeWide) + ' ' + (robeBottom - 3) + ' Q64 ' + (robeBottom + 4) + ' ' + (64 + robeWide) + ' ' + (robeBottom - 3) + '" fill="none" stroke="' + style.trim + '" stroke-width="3"/>';
  art += collar + embroidery;
  art += '<path d="M49 92 Q64 98 79 92 L78 99 Q64 105 50 99Z" fill="' + style.dark + '" stroke="' + style.trim + '" stroke-width="1.5"/>';
  art += '<path d="M74 99 l10 13 -4 18 -8 -3 4 -13 -8 -9Z" fill="' + style.trim + '" stroke="' + style.dark + '" stroke-width="1"/>';
  art += '<g transform="translate(0 ' + bob + ')">' + (front ? face : side ? face : '<path d="M53 35 Q64 31 75 35 L74 51 Q64 58 54 51Z" fill="#27262a"/>') + '</g>';
  art += '<g transform="translate(0 ' + bob + ')">' + (back ? rearHair : '') + bangs + ornament + '</g>';
  if (!left) art += '</g>';
  else art += '</g></g>';
  return art;
}

function makeSheet(style, dir, move) {
  const frames = Array.from({ length: 12 }, (_, i) => '<g transform="translate(' + (i * 128) + ' 0)">' + characterFrame(style, dir, move, i) + '</g>').join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="160" viewBox="0 0 1536 160">' + defs + frames + '</svg>';
}
function makePreview(style) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="160" viewBox="0 0 128 160">' + defs + characterFrame(style, "s", "idle", 0) + '</svg>';
}
function writeSvg(path, content) { writeFileSync(path, content, "utf8"); }

for (const style of STYLES) {
  writeSvg(resolve(previewOut, "style-preview-" + style.id + ".svg"), makePreview(style));
  for (const dir of DIRS) for (const move of moves) {
    const key = style.id + "_" + move + "_" + dir;
    writeSvg(resolve(charOut, key + ".svg"), makeSheet(style, dir, move));
  }
}

function treeSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="160" viewBox="0 0 128 160">' +
    '<defs><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a8bd83"/><stop offset=".52" stop-color="#587c56"/><stop offset="1" stop-color="#294b40"/></linearGradient><linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#422e25"/><stop offset=".5" stop-color="#9a6b43"/><stop offset="1" stop-color="#3a3027"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>' +
    '<ellipse cx="64" cy="146" rx="37" ry="8" fill="#07100c" opacity=".36" filter="url(#blur)"/>' +
    '<path d="M56 142 Q60 114 55 92 L44 78 L51 74 L61 91 L67 66 L74 67 L69 99 L84 79 L90 83 L72 112 L73 143Z" fill="url(#wood)" stroke="#2d3025" stroke-width="2"/>' +
    '<path d="M28 91 Q15 77 29 56 Q20 37 39 28 Q45 8 66 15 Q88 7 96 29 Q116 41 100 61 Q111 81 91 93 Q72 105 51 95Z" fill="url(#leaf)" stroke="#365540" stroke-width="2"/>' +
    '<path d="M34 57 Q40 24 65 24 Q91 19 99 49 M27 72 Q45 51 55 48 M76 38 Q91 43 96 64" fill="none" stroke="#d0d69a" stroke-opacity=".38" stroke-width="3"/>' +
    '<g fill="#d5df9e" opacity=".72"><circle cx="40" cy="43" r="3"/><circle cx="73" cy="30" r="2.5"/><circle cx="91" cy="67" r="3"/><circle cx="55" cy="78" r="2.2"/></g></svg>';
}
function rockSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80" viewBox="0 0 96 80"><defs><linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d2c9ae"/><stop offset=".5" stop-color="#817d70"/><stop offset="1" stop-color="#484e48"/></linearGradient></defs><ellipse cx="48" cy="70" rx="35" ry="6" fill="#07100c" opacity=".28"/><path d="M9 62 L14 38 L32 19 L57 13 L78 27 L89 55 L73 68 L28 68Z" fill="url(#stone)" stroke="#42463f" stroke-width="2"/><path d="M15 39 L33 22 L47 37 L37 59 L13 58Z" fill="#d8d0b9" opacity=".44"/><path d="M47 37 L59 17 L78 29 L71 50 L52 55Z" fill="#f2e5cb" opacity=".28"/><path d="M24 62 L36 51 M60 60 L76 43" stroke="#424a42" stroke-width="1.5" opacity=".55"/></svg>';
}
function buildingSvg(kind) {
  const title = kind.replaceAll("_", " ");
  const roofs = {
    hut: ["#a65d43", "#603e39", "#e0b17d"],
    foraging: ["#658a60", "#3c5a4b", "#d5c68d"],
    well: ["#788b87", "#465c57", "#d9c69b"],
    farm: ["#8c9c62", "#516843", "#dfc18b"],
    workshop: ["#8b6860", "#4d4240", "#d9b782"],
    storage: ["#9a805b", "#5b4b3d", "#e6c98e"],
    market: ["#a96e54", "#68463c", "#e5be80"]
  };
  const p = roofs[kind] || roofs.storage;
  const roof = kind === "well"
    ? '<path d="M39 60 L46 20 L82 20 L90 60Z" fill="' + p[0] + '" stroke="' + p[1] + '" stroke-width="3"/><path d="M43 24 L64 7 L86 24Z" fill="' + p[2] + '" stroke="' + p[1] + '" stroke-width="3"/>'
    : '<path d="M13 66 L62 23 L111 66 L102 77 L62 43 L22 77Z" fill="' + p[0] + '" stroke="' + p[1] + '" stroke-width="3"/><path d="M23 68 L62 39 L101 68" fill="none" stroke="' + p[2] + '" stroke-width="2.5"/>';
  const wall = kind === "well"
    ? '<ellipse cx="64" cy="91" rx="28" ry="15" fill="#6d7973" stroke="#3f514b" stroke-width="3"/><ellipse cx="64" cy="86" rx="22" ry="10" fill="#4d9ba0" stroke="#303f3d" stroke-width="3"/><path d="M42 86 L46 108 L82 108 L86 86" fill="#8a8d7b" stroke="#424a42" stroke-width="3"/>'
    : '<path d="M23 66 L23 116 L64 135 L64 82Z" fill="#c49d76" stroke="' + p[1] + '" stroke-width="3"/><path d="M64 82 L102 66 L102 116 L64 135Z" fill="#8f684e" stroke="' + p[1] + '" stroke-width="3"/>';
  const door = kind === "well" ? "" :
    '<path d="M47 107 Q47 91 64 89 Q80 92 80 107 L80 125 L47 125Z" fill="#392d29" stroke="#574034" stroke-width="2"/><circle cx="73" cy="111" r="2" fill="#e7c67e"/>';
  const windows = kind === "well" ? "" :
    '<path d="M29 81 L43 87 L43 102 L29 96Z" fill="#9fd1ce" stroke="#594331" stroke-width="2"/><path d="M85 85 L97 80 L97 96 L85 102Z" fill="#9fd1ce" stroke="#594331" stroke-width="2"/><path d="M36 87 L36 98 M90 84 L90 98" stroke="#ecd8ad" stroke-width="1.5"/>';
  const detail = kind === "foraging" || kind === "farm"
    ? '<path d="M21 118 Q64 143 107 118 M30 122 L34 132 M45 128 L48 138 M83 128 L80 138" fill="none" stroke="#7c9c59" stroke-width="3"/>'
    : kind === "market"
      ? '<path d="M21 57 L104 57 L98 73 L27 73Z" fill="#d5ac72" stroke="#714a43" stroke-width="2"/><path d="M42 58 L47 73 M63 58 L63 73 M84 58 L79 73" stroke="#f0d9ac" stroke-width="3"/>'
      : '<path d="M16 115 L111 115" stroke="#e0c28c" stroke-opacity=".7" stroke-width="2"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="152" viewBox="0 0 128 144">' +
    '<defs><linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e4c7a0"/><stop offset="1" stop-color="#936b4d"/></linearGradient><linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9d7651"/><stop offset="1" stop-color="#4d4235"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="3"/></filter></defs>' +
    '<ellipse cx="64" cy="133" rx="52" ry="8" fill="#050b08" opacity=".32" filter="url(#shadow)"/>' +
    wall + roof +
    '<path d="M23 66 L64 82 L102 66" fill="none" stroke="' + p[2] + '" stroke-width="4"/>' +
    door + windows + detail +
    '<path d="M24 116 L64 135 L102 116" fill="none" stroke="#e7d0a8" stroke-width="2" opacity=".7"/>' +
    '<path d="M18 69 L64 29 L110 69" fill="none" stroke="#f0d5a1" stroke-opacity=".3" stroke-width="2"/>' +
    '</svg>';
}
writeSvg(resolve(objectOut, "tree.svg"), treeSvg());
writeSvg(resolve(objectOut, "rock.svg"), rockSvg());
["hut", "foraging", "well", "farm", "workshop", "storage", "market"].forEach(kind => {
  writeSvg(resolve(objectOut, "facility_" + kind + ".svg"), buildingSvg(kind));
});
console.log("Generated 80 HD character atlases (12 frames × 8 directions × 5 silhouettes) and local isometric object artwork.");
