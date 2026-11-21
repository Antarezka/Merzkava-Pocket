// Merzkava Pocket — Game Mode entry. mountGame(host, { identity, storage, base, onExit }) -> { destroy, back, setSuspended }
// Flow: custom loading scene -> main menu (New Game / Continue / Options / Exit+confirm) -> character creator -> play.
import { GameEconomy } from "./data/economy.js";
import { createNewState, loadState, hasSave } from "./data/state.js";
import { GameEngine } from "./engine.js";
import { ROSTER } from "./data/mobs.js";
import { loadGameAssets } from "./loader.js";
import { createGameUI, h } from "./ui.js";
import { createAudio, createMusic } from "./game-audio.js";
import { minuteOfDay } from "./data/clock.js";
import { drawBreathing } from "./art/anim.js";
import { DIRS, CELL } from "./art/models.js";
import { LOOKS, LOOK_ZONE_LABELS, BODIES, EXPRESSION_LIST, EYE_SHAPE_LIST, SKINS, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, defaultAppearance, normalizeAppearance, appearanceToSpec } from "./art/library.js";

const OPT_KEY = "mp-game-opts";
const QUALITY = { high: { dprCap: 2.5, sheetScale: 0.8 }, medium: { dprCap: 1.75, sheetScale: 0.6 }, low: { dprCap: 1.25, sheetScale: 0.45 } };
const DEFAULT_OPTS = { quality: "high", fps: 60, showFps: false, music: 55, sfx: 80, beatOffset: 0 };
const ANIMALS = ["sheep", "bunny", "chick", "cat", "bear"];
const TIPS = ["The fluffy ones are fetching water…", "Sweeping fallen autumn leaves…", "Counting the stones in the river…", "Waking the little merchant's pony…", "Brewing a very small pot of tea…", "Tying the last knot on the fence…"];

function loadOpts(storage) { try { return { ...DEFAULT_OPTS, ...JSON.parse(storage.getItem(OPT_KEY) || "{}") }; } catch { return { ...DEFAULT_OPTS }; } }
const q = (o) => ({ ...QUALITY[o.quality] || QUALITY.high, fps: o.fps, showFps: o.showFps });

// ------------------------------------------------------------------ cute animals (inline SVG, drawn fluffy with a displacement filter)
const FACE = (x = 50, y = 62, dx = 9) => `<circle cx="${x - dx}" cy="${y}" r="2.8" fill="#4a3340"/><circle cx="${x + dx}" cy="${y}" r="2.8" fill="#4a3340"/><circle cx="${x - dx + 1}" cy="${y - 1}" r=".9" fill="#fff"/><circle cx="${x + dx + 1}" cy="${y - 1}" r=".9" fill="#fff"/><ellipse cx="${x - dx - 5}" cy="${y + 6}" rx="4" ry="2.6" fill="#ffa7b8" opacity=".75"/><ellipse cx="${x + dx + 5}" cy="${y + 6}" rx="4" ry="2.6" fill="#ffa7b8" opacity=".75"/><path d="M${x - 2.5} ${y + 5.5}q2.5 3 5 0" stroke="#4a3340" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const SVG = {
  sheep: `<svg viewBox="0 0 100 100"><g fill="#fffdfb" stroke="#f1dfe6" stroke-width="2"><circle cx="28" cy="56" r="19"/><circle cx="50" cy="44" r="22"/><circle cx="72" cy="56" r="19"/><circle cx="36" cy="72" r="17"/><circle cx="64" cy="72" r="17"/><circle cx="50" cy="66" r="18"/></g><ellipse cx="33" cy="60" rx="6" ry="9" fill="#f3cdb9" transform="rotate(25 33 60)"/><ellipse cx="67" cy="60" rx="6" ry="9" fill="#f3cdb9" transform="rotate(-25 67 60)"/><ellipse cx="50" cy="64" rx="15" ry="14" fill="#f8dccb"/>${FACE(50, 64, 8)}<rect x="40" y="86" width="6" height="9" rx="3" fill="#6b5560"/><rect x="56" y="86" width="6" height="9" rx="3" fill="#6b5560"/></svg>`,
  bunny: `<svg viewBox="0 0 100 100"><ellipse cx="37" cy="24" rx="8" ry="22" fill="#fffdfb" stroke="#f1dfe6" stroke-width="2" transform="rotate(-8 37 24)"/><ellipse cx="63" cy="24" rx="8" ry="22" fill="#fffdfb" stroke="#f1dfe6" stroke-width="2" transform="rotate(8 63 24)"/><ellipse cx="37" cy="26" rx="3.6" ry="14" fill="#ffc3d1" transform="rotate(-8 37 26)"/><ellipse cx="63" cy="26" rx="3.6" ry="14" fill="#ffc3d1" transform="rotate(8 63 26)"/><circle cx="50" cy="66" r="29" fill="#fffdfb" stroke="#f1dfe6" stroke-width="2"/>${FACE(50, 64, 11)}<circle cx="50" cy="69" r="2.2" fill="#ff9db3"/></svg>`,
  chick: `<svg viewBox="0 0 100 100"><path d="M44 24q6-14 12 0q-6-3-12 0z" fill="#ffd34d"/><circle cx="50" cy="60" r="31" fill="#ffe27a" stroke="#f3c94f" stroke-width="2"/><ellipse cx="24" cy="64" rx="8" ry="12" fill="#ffd45a" transform="rotate(20 24 64)"/><ellipse cx="76" cy="64" rx="8" ry="12" fill="#ffd45a" transform="rotate(-20 76 64)"/>${FACE(50, 56, 12).replace(/M[^"]*"/, '"')}<path d="M44 62l6 7 6-7z" fill="#ff9a4d"/><rect x="40" y="88" width="3" height="8" rx="1.5" fill="#ff9a4d"/><rect x="58" y="88" width="3" height="8" rx="1.5" fill="#ff9a4d"/></svg>`,
  cat: `<svg viewBox="0 0 100 100"><path d="M24 40l4-24 20 14z M76 40l-4-24-20 14z" fill="#f6c48f" stroke="#e9ae73" stroke-width="2" stroke-linejoin="round"/><path d="M30 34l2-10 9 6z M70 34l-2-10-9 6z" fill="#ffb6c3"/><circle cx="50" cy="60" r="31" fill="#f8cc99" stroke="#e9ae73" stroke-width="2"/><path d="M50 30v10M38 33l3 8M62 33l-3 8" stroke="#e29a5c" stroke-width="3" stroke-linecap="round"/>${FACE(50, 62, 12)}<g stroke="#b78a6a" stroke-width="1.2" stroke-linecap="round"><path d="M14 62l14 3M14 70l14-2M86 62l-14 3M86 70l-14-2"/></g></svg>`,
  bear: `<svg viewBox="0 0 100 100"><circle cx="26" cy="34" r="12" fill="#c99a74" stroke="#b6825c" stroke-width="2"/><circle cx="74" cy="34" r="12" fill="#c99a74" stroke="#b6825c" stroke-width="2"/><circle cx="26" cy="34" r="6" fill="#f2c9ab"/><circle cx="74" cy="34" r="6" fill="#f2c9ab"/><circle cx="50" cy="60" r="31" fill="#d2a47e" stroke="#b6825c" stroke-width="2"/><ellipse cx="50" cy="70" rx="14" ry="11" fill="#f7e0c8"/>${FACE(50, 58, 13).replace(/<path[^>]*\/>/, "")}<ellipse cx="50" cy="66" rx="4.5" ry="3.2" fill="#4a3340"/><path d="M50 69v4M45 74q5 4 10 0" stroke="#4a3340" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
};
const FLUFF_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="gm-fluff" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4.5"/></filter></defs></svg>`;

export function mountGame(host, { identity, storage = window.localStorage, base = "./", onExit = () => {} } = {}) {
  const id = identity || { role: "developer", displayName: "Guest", identityRef: "guest" };
  const cssUrl = new URL("./game.css", import.meta.url).href;
  if (!document.querySelector(`link[data-gm-css]`)) document.head.append(h("link", { rel: "stylesheet", href: cssUrl, "data-gm-css": "1" }));
  host.innerHTML = ""; const root = h("div", { class: "gm" }); root.innerHTML = FLUFF_DEFS;
  const canvas = h("canvas", { class: "gm-canvas gm-hidden" }), screenEl = h("div", { class: "gm-screen" }), hud = h("div", { class: "gm-hud gm-hidden" }), layer = h("div", { class: "gm-layer", style: "pointer-events:none" }), toastBox = h("div", { class: "gh-toasts" });
  layer.style.pointerEvents = "none"; new MutationObserver(() => { layer.style.pointerEvents = layer.children.length ? "auto" : "none"; }).observe(layer, { childList: true });
  const frame = h("div", { class: "gm-frame" }), uiBox = h("div", { class: "gm-ui" }); uiBox.append(screenEl, hud, layer, toastBox); frame.append(canvas, uiBox); root.append(frame); host.append(root);
  // portrait-only window: fit the frame to the host on every resize (window resize, orientation change, mini-window drag/resize)
  function fit() {
    const W = Math.max(1, root.clientWidth || window.innerWidth), H = Math.max(1, root.clientHeight || window.innerHeight), r = W / H; let fw = W, fh = H;
    if (r > 0.76) fw = Math.round(H * 0.5625); else if (r < 0.42) fh = Math.round(W / 0.42);
    const Lw = Math.max(340, Math.min(460, fw)), k = fw / Lw, Lh = fh / k;
    frame.style.cssText = `width:${fw}px;height:${fh}px;left:${Math.round((W - fw) / 2)}px;top:${Math.round((H - fh) / 2)}px`;
    uiBox.style.cssText = `width:${Lw}px;height:${Lh}px;transform:scale(${k});--gw:${Lw}px;--gh:${Lh}px`; root.dataset.k = k.toFixed(3); engine?.resize();
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => fit()) : null; ro?.observe(root); window.addEventListener("resize", fit); window.addEventListener("orientationchange", fit);

  let opts = loadOpts(storage), assets = null, eco = null, engine = null, ui = null, screen = "loading", dead = false, backStack = [], appearance = null, exitConfirm = null, timers = [];
  fit(); const audio = createAudio(() => opts), music = createMusic({ base, getOpts: () => opts });   // game BGM / beat songs / effects: the app's CRIWARE engine, game channels only (see game-audio.js)
  const saveOpts = () => { try { storage.setItem(OPT_KEY, JSON.stringify(opts)); } catch {} audio.refresh(); music.refresh(); };
  const later = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
  const setScreen = (name, el) => { screen = name; clearTimers(); screenEl.replaceChildren(el); screenEl.classList.remove("gm-hidden"); };

  // ------------------------------------------------------------------ loading scene
  function showLoading(done) {
    const clouds = [0, 1, 2, 3].map((i) => h("div", { class: "gl-cloud", style: `top:${8 + i * 9}%;width:${90 + i * 26}px;height:${26 + i * 5}px;animation-duration:${38 + i * 11}s;animation-delay:-${i * 14}s` }));
    const petals = Array.from({ length: 14 }, (_, i) => h("i", { class: "gl-petal", style: `left:${(i * 73) % 100}%;animation-duration:${7 + (i % 5) * 1.6}s;animation-delay:-${(i * 1.3) % 8}s;background:${["#ffb7c9", "#ffd0a8", "#ffe29a"][i % 3]}` }));
    const herd = h("div", { class: "gl-herd" }, ANIMALS.map((a, i) => h("div", { class: "gl-animal", "data-i": i, style: `left:${8 + i * 4}%;animation-delay:-${i * 0.17}s`, html: SVG[a] })));
    const bar = h("i"), pct = h("span", { class: "gl-pct" }, "0%"), msg = h("div", { class: "gl-msg" }, TIPS[0]);
    setScreen("loading", h("div", { class: "gl" }, ...clouds, ...petals, h("div", { class: "gl-title" }, h("small", null, "MERZKAVA POCKET"), h("h1", null, "ちょっと待ってね"), h("p", null, "Just a moment — the fluffy ones are setting up your world")), h("div", { class: "gl-meadow" }), herd, h("div", { class: "gl-bar" }, bar), pct, msg));
    let real = 0, shown = 0, label = "", fin = false; const t0 = performance.now(), MIN = 3400;
    loadGameAssets({ base, looks: ["burgundy8"], onProgress: (p, l) => { real = p; label = l; } }).then((a) => { assets = a; real = 1; }).catch((e) => { console.error(e); msg.textContent = "Couldn't load the game files. " + e.message; fin = true; });
    const raf = () => { if (dead || fin) return; const el = performance.now() - t0, tgt = Math.min(real, Math.min(1, el / MIN)); shown += (tgt - shown) * 0.1; const p = Math.min(1, shown);
      bar.style.width = (p * 100).toFixed(1) + "%"; pct.textContent = Math.round(p * 100) + "%"; msg.textContent = TIPS[Math.min(TIPS.length - 1, Math.floor(p * TIPS.length))] + (label && p < 0.99 ? "  ·  " + label : "");
      herd.querySelectorAll(".gl-animal").forEach((a, i) => { a.style.left = `${Math.max(6, Math.min(94, 6 + p * 88 - i * 5.5))}%`; });
      if (real >= 1 && shown > 0.995 && el > MIN) { fin = true; setTimeout(() => !dead && done(), 250); return; } requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // ------------------------------------------------------------------ main menu
  function showMenu() {
    backStack = []; closeEngine(); canvas.classList.add("gm-hidden"); hud.classList.add("gm-hidden"); exitConfirm = null;
    const has = hasSave(id, storage); let saved = null; if (has && assets) { const r = loadState(id, assets.catalog, storage); if (r.ok) saved = r.state; }
    const A = (n) => `${base}game-art/menu/${n}.webp`, leafCols = ["#bff5df", "#8de9c5", "#e4fff4", "#6fd8b4"];
    const leaves = Array.from({ length: 16 }, (_, i) => h("i", { class: "gmm-bub", style: `left:${(i * 37 + 9) % 96}%;--sz:${5 + (i * 7) % 13}px;--sw:${(i % 2 ? 1 : -1) * (10 + (i * 5) % 22)}px;animation-duration:${11 + (i % 7) * 2.3}s;animation-delay:-${(i * 2.9) % 17}s;color:${leafCols[i % 4]}` }));
    const sparks = [[300, 640], [452, 600], [150, 830], [520, 760], [250, 980], [470, 1040], [370, 560], [80, 700], [540, 900], [330, 1090]].map(([x, y], i) => h("i", { class: "gmm-spark", style: `left:${x}px;top:${y}px;animation-delay:-${(i * 0.7) % 4}s;transform:scale(${0.6 + (i % 3) * 0.3})` }));
    const startAudio = () => music.play("menu");
    const B = (key, y, h0, fn, off) => h("button", { class: "gmm-b" + (off ? " off" : ""), type: "button", "aria-label": key, style: `top:${y}px;height:${h0}px;--i:${["new", "continue", "archive", "options", "exit"].indexOf(key)}`, disabled: !!off, onclick: () => { audio.tap(); startAudio(); fn(); } }, h("img", { src: A("b_" + key), alt: "", draggable: "false" }));
    const box = h("div", { class: "gmm-box" }, ...sparks,
      h("img", { class: "gmm-logo", src: A("logo"), alt: "MERZKAVA — The Pocket Archive", draggable: "false" }),
      B("new", 527, 105, () => (saved ? confirmNew() : showCreator())), B("continue", 634, 103, () => saved && continueGame(saved), !saved), B("archive", 740, 104, () => showArchive(saved)), B("options", 847, 104, () => showOptions(showMenu)), B("exit", 953, 104, askExit),
      h("div", { class: "gmm-foot" }, id.role.toUpperCase() + " · " + id.displayName));
    const el = h("div", { class: "gmm" }, h("div", { class: "gmm-bg", style: `background-image:url(${A("bg")})` }), h("div", { class: "gmm-caustics" }), ...leaves, box);
    const fit = () => { const k = Math.min(el.clientWidth / 756, el.clientHeight / 1344) || 1; box.style.setProperty("--k", k.toFixed(4)); box.style.setProperty("--tx", Math.max(0, (el.clientWidth - 756 * k) / 2).toFixed(1) + "px"); };
    setScreen("menu", el); fit(); const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null; ro?.observe(el); setTimeout(fit, 400);
  }
  // ARCHIVE: what this save has discovered (bestiary) and a few lifetime records
  function showArchive(saved) {
    backStack.push(showMenu); let tab = "dex"; const body = h("div", { class: "gs-body" });
    const hero = saved?.flags?.hero || {}, dex = hero.dex || {}, seen = ROSTER.filter((m) => dex[m.id]).length;
    const draw = () => { body.replaceChildren();
      if (!saved) { body.append(h("p", { class: "gc-note" }, "Nothing is recorded yet. Begin a journey and the Archive starts filling in.")); return; }
      if (tab === "dex") { body.append(h("div", { class: "gs-sec" }, `BESTIARY · ${seen} / ${ROSTER.length}`), h("div", { class: "ar-grid" }, ROSTER.map((m) => { const n = dex[m.id] || 0; return h("div", { class: "ar-cell" + (n ? "" : " lock") + (m.tier !== "mob" ? " " + m.tier : "") }, h("img", { src: `${base}game-art/monsters/${m.art}.png`, alt: "", loading: "lazy", style: `filter:hue-rotate(${m.hue || 0}deg) saturate(${m.sat || 1}) brightness(${m.bri || 1})` }), h("b", null, n ? m.name : "???"), h("small", null, n ? `${m.jp || ""} · ×${n}` : `Lv ${m.lv[0]}+`)); }))); }
      else { const f = saved.flags || {}, st = saved.stats || {}, rows = [["Name", saved.profile.name], ["Level", hero.lv || 1], ["Monsters defeated", hero.kills || 0], ["Resources gathered", st.gathered || 0], ["Goods sold", st.sold || 0], ["Things built", st.built || 0], ["Days lived", (saved.clock?.day ?? 0) + 1], ["Realm", f.realm?.n ? `Realm ${f.realm.n}` : "Guanghuan Initiate"], ["Origin", f.innate?.name || "Not awakened"]];
        body.append(h("div", { class: "gs-sec" }, "RECORDS"), ...rows.map(([k, v]) => h("div", { class: "gs-row" }, h("div", null, h("b", null, k)), h("span", { class: "ar-v" }, String(v))))); } };
    const tabs = h("div", { class: "gc-chips ar-tabs" }, [["dex", "BESTIARY"], ["rec", "RECORDS"]].map(([k, l]) => h("button", { class: "gm-chip" + (k === tab ? " on" : ""), onclick: (e) => { tab = k; tabs.querySelectorAll("button").forEach((b) => b.classList.remove("on")); e.target.classList.add("on"); audio.tap(); draw(); } }, l)));
    setScreen("archive", h("div", { class: "gs" }, h("div", { class: "gs-head" }, h("button", { class: "gs-back", onclick: () => goBack() }, "‹"), h("h2", null, "ARCHIVE")), tabs, body)); draw();
  }
  async function drawHero(cv, app) {
    const spec = appearanceToSpec(app); await assets.kit.load(spec.model); if (dead || !cv.isConnected) return; const x = cv.getContext("2d"), spr = assets.kit.render(spec, "S"), hip = assets.kit.hipRow(spec.model) / CELL.h, t0 = performance.now();
    later(() => { x.clearRect(0, 0, CELL.w, CELL.h); drawBreathing(x, spr, 0, 0, CELL.w, CELL.h, 0, 0, CELL.w, CELL.h, hip, (performance.now() - t0) / 1000, 1.3); }, 33);
  }
  function confirmNew() { const el = h("div", { class: "gp", style: "align-items:center;justify-content:center" }, h("div", { class: "gp-card", style: "width:82%;padding:18px;background:#32263d" }, h("h4", { style: "font-size:16px" }, "Start a new game?"), h("p", null, "Your current save will be replaced once you finish creating a new character."), h("div", { style: "display:flex;gap:10px;margin-top:12px" }, h("button", { class: "gm-btn alt sm", style: "flex:1", onclick: () => el.remove() }, "CANCEL"), h("button", { class: "gm-btn rose sm", style: "flex:1", onclick: () => { el.remove(); showCreator(); } }, "NEW GAME")))); layer.append(el); }
  function askExit() { if (exitConfirm) return; exitConfirm = h("div", { class: "gp", style: "align-items:center;justify-content:center" }, h("div", { class: "gp-card", style: "width:82%;padding:18px;background:#32263d" }, h("h4", { style: "font-size:16px" }, "Leave Game Mode?"), h("p", null, "Your progress is saved automatically."), h("div", { style: "display:flex;gap:10px;margin-top:12px" }, h("button", { class: "gm-btn alt sm", style: "flex:1", onclick: () => { exitConfirm.remove(); exitConfirm = null; } }, "STAY"), h("button", { class: "gm-btn rose sm", style: "flex:1", onclick: () => { audio.destroy(); destroy(); onExit(); } }, "EXIT")))); layer.append(exitConfirm); }

  // ------------------------------------------------------------------ options
  function showOptions(back) {
    backStack.push(back); const seg = (key, list) => h("div", { class: "gs-seg" }, list.map(([v, l]) => h("button", { class: opts[key] === v ? "on" : "", onclick: (e) => { opts[key] = v; saveOpts(); e.target.parentNode.querySelectorAll("button").forEach((b) => b.classList.remove("on")); e.target.classList.add("on"); audio.tap(); } }, l)));
    const tog = (key) => { const b = h("button", { class: "gs-toggle" + (opts[key] ? " on" : ""), onclick: () => { opts[key] = !opts[key]; saveOpts(); b.classList.toggle("on", opts[key]); audio.tap(); } }); return b; };
    const range = (key, onchange) => h("input", { type: "range", class: "gs-range", min: 0, max: 100, value: opts[key], oninput: (e) => { opts[key] = +e.target.value; saveOpts(); onchange?.(); } });
    const row = (t, s, c) => h("div", { class: "gs-row" }, h("div", null, h("b", null, t), s ? h("small", null, s) : null), c);
    const el = h("div", { class: "gs" }, h("div", { class: "gs-head" }, h("button", { class: "gs-back", onclick: () => goBack() }, "‹"), h("h2", null, "OPTIONS")),
      h("div", { class: "gs-body" }, h("div", { class: "gs-sec" }, "GRAPHICS"), row("Quality", "Sharpness of the world and sprites", seg("quality", [["low", "Low"], ["medium", "Med"], ["high", "High"]])), row("Show FPS", "Frame counter in game", tog("showFps")),
        h("div", { class: "gs-sec" }, "PERFORMANCE"), row("Frame limit", "30 saves battery on older phones", seg("fps", [[30, "30"], [60, "60"]])),
        h("div", { class: "gs-sec" }, "AUDIO"), row("Music", "Game music only", range("music")), row("Effects", null, range("sfx", () => audio.tap())), row("Beat timing", "Shift the rhythm event if taps feel early or late (ms)", seg("beatOffset", [[-100, "−100"], [-50, "−50"], [0, "0"], [50, "+50"], [100, "+100"]])),
        h("p", { class: "gc-note" }, "These settings only affect Game Mode. Graphics changes apply when you return to the world.")));
    setScreen("options", el);
  }
  function goBack() { const f = backStack.pop(); if (screen === "options" && engine) { applyOptsToEngine(); screenEl.classList.add("gm-hidden"); screen = "play"; return; } (f || showMenu)(); }
  function applyOptsToEngine() { if (!engine) return; engine.opts = q(opts); engine.resize(); if (engine.appSpec) engine.setAppearanceSheet(engine.appSpec); }

  // ------------------------------------------------------------------ character creator
  function randomApp() { const pick = (a) => a[Math.floor(Math.random() * a.length)], look = pick(LOOKS), a = defaultAppearance(look.id); a.body = pick(BODIES).id; if (Math.random() < 0.6) a.hairColor = pick(HAIR_COLORS); if (Math.random() < 0.7) a.skin = pick(SKINS); a.colors = {}; for (const z of [4, 5, 6]) if (look.zones.includes(z) && Math.random() < 0.7) a.colors[z] = pick(CLOTH_COLORS); return a; }
  function showCreator() {
    let app = normalizeAppearance(defaultAppearance("burgundy8")), tab = "look", dir = 0, auto = true, name = id.role === "player" ? id.displayName : (id.displayName || "Wanderer");
    const cv = h("canvas", { width: CELL.w, height: CELL.h }), cx = cv.getContext("2d"), panel = h("div", { class: "gc-panel" }), tabs = h("div", { class: "gc-tabs" }), nameIn = h("input", { value: name, maxlength: 18, placeholder: "Your name", oninput: (e) => { name = e.target.value; } });
    if (id.role === "player") nameIn.readOnly = true;
    let cur = null, curHip = 0.8; const t0 = performance.now();
    const paint = async () => { const spec = appearanceToSpec(app); if (!assets.kit.has(spec.model)) await assets.kit.load(spec.model); if (!cv.isConnected) return; cur = assets.kit.render(spec, DIRS[dir]); curHip = assets.kit.hipRow(spec.model) / CELL.h; tickBreath(); };
    const tickBreath = () => { if (!cur || !cv.isConnected) return; cx.clearRect(0, 0, CELL.w, CELL.h); drawBreathing(cx, cur, 0, 0, CELL.w, CELL.h, 0, 0, CELL.w, CELL.h, curHip, (performance.now() - t0) / 1000, 1.3); };
    const set = (patch) => { app = normalizeAppearance({ ...app, ...patch }); paint(); }, redraw = () => { renderTabs(); renderPanel(); paint(); };
    const sw = (list, cur, onpick, onreset, custom = true) => h("div", { class: "gc-sw" }, list.map((c) => h("button", { class: c === cur ? "on" : "", style: `background:${c}`, onclick: () => { audio.tap(); onpick(c); renderPanel(); } })),
      custom ? h("label", { title: "Custom colour" }, h("input", { type: "color", value: cur || "#ffffff", oninput: (e) => onpick(e.target.value), onchange: () => renderPanel() })) : null, onreset ? h("button", { class: "reset", onclick: () => { audio.tap(); onreset(); renderPanel(); } }, "ORIGINAL") : null);
    function renderPanel() {
      const look = LOOKS.find((l) => l.id === app.look), ids = assets.kit.models[app.look], labels = LOOK_ZONE_LABELS[app.look] || {}, out = [];
      if (tab === "look") {
        out.push(h("div", { class: "gc-looks" }, LOOKS.map((l) => h("button", { class: "gc-look" + (l.id === app.look ? " on" : ""), onclick: async () => { audio.tap(); await assets.kit.load(l.id); app = { ...defaultAppearance(l.id), body: app.body }; app = normalizeAppearance(app); redraw(); } }, h("img", { src: `${base}game-art/models/${l.id}/thumb.png`, alt: "" }), l.label))));
        out.push(h("p", { class: "gc-note" }, "Every model has its own hairstyle, outfit and face proportions, drawn in all 8 directions with its own walking pose. More characters are on the way."));
      } else if (tab === "body") {
        out.push(h("div", { class: "gs-sec" }, "BODY PROPORTION"), h("div", { class: "gc-chips" }, BODIES.map((b) => h("button", { class: "gm-chip" + (b.id === app.body ? " on" : ""), onclick: () => { audio.tap(); set({ body: b.id }); renderPanel(); } }, b.label))));
        if (!look.noSkin) out.push(h("div", { class: "gs-sec" }, "SKIN"), sw(SKINS, app.skin, (c) => set({ skin: c }), () => set({ skin: null })));
      } else if (tab === "face") {
        if (look.faceFixed) out.push(h("p", { class: "gc-note" }, "This character's face is kept exactly as drawn in its reference art. Eye colour and expressions are available on the first three characters (burgundy haori, bunny hood, layered robe)."));
        else {
          out.push(h("div", { class: "gs-sec" }, "EXPRESSION"), h("div", { class: "gc-chips" }, EXPRESSION_LIST.map(([v, l]) => h("button", { class: "gm-chip" + (v === app.expression ? " on" : ""), onclick: () => { audio.tap(); set({ expression: v }); renderPanel(); } }, l))));
          out.push(h("div", { class: "gs-sec" }, "EYE SHAPE"), h("div", { class: "gc-chips" }, EYE_SHAPE_LIST.map(([v, l]) => h("button", { class: "gm-chip" + (v === app.eyeShape ? " on" : ""), onclick: () => { audio.tap(); set({ eyeShape: v, expression: app.expression }); renderPanel(); } }, l))));
          out.push(h("div", { class: "gs-sec" }, "EYE COLOUR"), sw(EYE_COLORS, app.eyeColor, (c) => set({ eyeColor: c }), () => set({ eyeColor: null })));
          out.push(h("div", { class: "gs-sec" }, "BROW COLOUR"), sw(HAIR_COLORS, app.browColor, (c) => set({ browColor: c }), () => set({ browColor: null })));
        }
      } else {
        if (!look.noSkin) out.push(h("div", { class: "gc-zone" }, h("b", null, "SKIN"), sw(SKINS, app.skin, (c) => set({ skin: c }), () => set({ skin: null }))));
        for (const z of look.zones) { if (z === 3 && look.faceFixed) continue; const isHair = z === 2, isEye = z === 3, cur = isHair ? app.hairColor : isEye ? app.eyeColor : app.colors[z];
          out.push(h("div", { class: "gc-zone" }, h("b", null, (labels[z] || "Part " + z).toUpperCase()), sw(isHair ? HAIR_COLORS : isEye ? EYE_COLORS : CLOTH_COLORS, cur, (c) => { if (isHair) set({ hairColor: c }); else if (isEye) set({ eyeColor: c }); else set({ colors: { ...app.colors, [z]: c } }); }, () => { if (isHair) set({ hairColor: null }); else if (isEye) set({ eyeColor: null }); else { const c = { ...app.colors }; delete c[z]; set({ colors: c }); } }))); }
        out.push(h("p", { class: "gc-note" }, "Tap a swatch or use the rainbow dot for any colour. “Original” restores the reference colour."));
      }
      panel.replaceChildren(...out);
    }
    function renderTabs() { tabs.replaceChildren(...[["look", "LOOK"], ["body", "BODY"], ["face", "FACE"], ["color", "COLOURS"]].map(([k, l]) => h("button", { class: tab === k ? "on" : "", onclick: () => { audio.tap(); tab = k; renderTabs(); renderPanel(); } }, l))); }
    const rot = h("div", { class: "gc-rot" }, h("button", { onclick: () => { dir = (dir + 7) % 8; auto = false; autoB.classList.remove("on"); paint(); } }, "◀"));
    const autoB = h("button", { class: "on", onclick: () => { auto = !auto; autoB.classList.toggle("on", auto); } }, "↻"); rot.append(autoB, h("button", { onclick: () => { dir = (dir + 1) % 8; auto = false; autoB.classList.remove("on"); paint(); } }, "▶"));
    const el = h("div", { class: "gs" }, h("div", { class: "gs-head", style: "padding-bottom:4px" }, h("button", { class: "gs-back", onclick: () => showMenu() }, "‹"), h("h2", null, "NEW CHARACTER")),
      h("div", { class: "gc-stage" }, cv, rot), h("div", { class: "gc-name" }, h("span", null, id.role === "player" ? "PROFILE NAME" : "NAME"), nameIn), tabs, panel,
      h("div", { class: "gs-foot" }, h("button", { class: "gm-btn alt", style: "flex:1", onclick: () => { audio.tap(); app = normalizeAppearance(randomApp()); assets.kit.load(app.look).then(redraw); } }, "RANDOM"), h("button", { class: "gm-btn", style: "flex:2", onclick: () => { audio.ok(); startNew((name || "").trim() || id.displayName || "Wanderer", app); } }, "BEGIN")));
    setScreen("creator", el); renderTabs(); renderPanel(); paint();
    later(() => { if (auto) { dir = (dir + 1) % 8; paint(); } }, 1400); later(tickBreath, 33);   // after setScreen(), which clears the previous screen's timers
  }

  // ------------------------------------------------------------------ play
  function startNew(name, app) { const state = createNewState({ identity: id, name: id.role === "player" ? id.displayName : name, appearance: app, catalog: assets.catalog }); state.profile.appearance = app; beginPlay(state); }
  async function continueGame(state) { beginPlay(state); }
  let moodT = 0;   // the day theme plays at night too, a little softer
  async function beginPlay(state) {
    const app = normalizeAppearance(state.profile.appearance || defaultAppearance("burgundy8")); state.profile.appearance = app; await assets.kit.load(app.look); if (dead) return;
    eco = new GameEconomy(assets.catalog, state, { storage, identity: id }); eco.tick(); eco.save(); appearance = app; clearTimers(); screenEl.replaceChildren(); screenEl.classList.add("gm-hidden"); canvas.classList.remove("gm-hidden"); hud.classList.remove("gm-hidden"); hud.replaceChildren(); layer.replaceChildren(); screen = "play";
    music.play("day"); ui = createGameUI({ hud, layer, toastBox, eco, catalog: assets.catalog, identity: id, audio, music, getOpts: () => opts, getEngine: () => engine, onPause: (what) => { if (what === "options") showOptions(() => { screenEl.classList.add("gm-hidden"); screen = "play"; }); else saveAndMenu(); } });
    engine = new GameEngine({ canvas, world: assets.world, areas: assets.areas, kit: assets.kit, appearance: appearanceToSpec(app), economy: eco, catalog: assets.catalog, ui, options: q(opts) }); engine.appSpec = appearanceToSpec(app); engine.start(); { const sa = eco.state.flags?.area; if (sa && sa !== "home") engine.travel(sa, null, { instant: true, pos: eco.state.position }); } if (opts.music > 0) audio.music(true);
    clearInterval(moodT); moodT = setInterval(() => { if (!eco) return; const m = minuteOfDay(eco.now()) / 60; music.mood(m < 5.5 || m > 19.5 ? 0.65 : 1); }, 4000);
    if (!state.flags.welcomed) { state.flags.welcomed = true; ui.say([`Welcome, ${state.profile.name}.`, "Tap anywhere to walk, and tap trees, rocks and weeds to gather. The big AUTO button (bottom right) hunts monsters for you."]); }
  }
  function closeEngine() { clearInterval(moodT); if (engine) { try { eco.state.position = { x: Math.round(engine.player.x), y: Math.round(engine.player.y) }; eco.save(); } catch {} engine.destroy(); engine = null; } ui?.destroy(); ui = null; eco = null; hud.replaceChildren(); }
  function saveAndMenu() { closeEngine(); layer.replaceChildren(); showMenu(); }

  // ------------------------------------------------------------------ boot, back button, teardown
  showLoading(() => showMenu());
  function back() {
    if (screen === "loading") return true;
    if (screen === "play") { if (layer.querySelector(".gp")) { ui?.close(); return true; } if (ui && ui.placeBox && !ui.placeBox.classList.contains("gm-hidden")) { engine.cancelPlacing(); ui.placeBox.classList.add("gm-hidden"); ui.bar.classList.remove("gm-hidden"); ui.side.classList.remove("gm-hidden"); return true; } ui?.openPause(); return true; }
    if (screen === "menu") { if (exitConfirm) { exitConfirm.remove(); exitConfirm = null; } else if (layer.querySelector(".gp")) layer.replaceChildren(); else askExit(); return true; }
    if (screen === "options") { goBack(); return true; }
    if (screen === "creator") { showMenu(); return true; }
    return false;
  }
  function destroy() { if (dead) return; dead = true; music.destroy(); clearInterval(moodT); ro?.disconnect(); window.removeEventListener("resize", fit); window.removeEventListener("orientationchange", fit); clearTimers(); closeEngine(); audio.destroy(); host.innerHTML = ""; }
  function setSuspended(on) { if (!engine) return; if (on) engine.pauseLoop(); else engine.start(); }
  return { destroy, back, setSuspended, _debug: () => ({ engine, eco, ui }) };   // _debug: test hook only
}
