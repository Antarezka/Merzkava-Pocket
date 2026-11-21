// Game-mode engine: Canvas 2D top-down (slightly tilted) renderer, tap-only control, A* movement, gather / build / merchant interaction.
// Dependency-free. The economy rules live in data/economy.js — this file only drives the world and asks the economy for outcomes.
import { elementOf } from "./data/realms.js";
import { drawGuanghuan, guanghuanItems } from "./art/guanghuan.js";
import { buildSheet, drawBreathing } from "./art/anim.js";
import { drawHouse, drawFacility, drawConstructionSite, drawCart, drawMarker, facilityFootprint } from "./art/world.js";
import { minuteOfDay } from "./data/clock.js";
import * as A from "./art/animate.js";
import { Grinder } from "./combat.js";

const CHAR_H = 118, SPEED = 170;
const DIR_ROW = { S: [0, false], SE: [1, false], E: [2, false], NE: [3, false], N: [4, false], NW: [5, false], W: [6, false], SW: [7, false] };   // every direction is its own traced view
const dirFromVec = (dx, dy) => { const a = Math.atan2(dy, dx), k = (Math.round(a / (Math.PI / 4)) + 8) % 8; return ["E", "SE", "S", "SW", "W", "NW", "N", "NE"][k]; };

export class GameEngine {
  constructor({ canvas, world, kit, appearance, economy, catalog, ui, spriteFor }) {
    this.opts = arguments[0].options || {}; this.cv = canvas; this.ctx = canvas.getContext("2d"); this.world = world; this.kit = kit; this.eco = economy; this.catalog = catalog; this.ui = ui;
    this.time = 0; this.running = false; this.cam = { x: 0, y: 0 }; this.zoom = 1; this.vw = 0; this.vh = 0; this.dpr = 1;
    this.player = { x: 0, y: 0, dir: "S", moving: false, path: [], action: null, sheet: null, frame: 0 };
    this.markers = []; this.ghost = null; this.selected = null; this.hidden = new Set();
    this.spriteFor = spriteFor; // (appearance) -> sheet  (merchant npc etc.)
    this.lock = 0; this._npcCell = new Map(); this.areas = arguments[0].areas || null; this.areaId = world.areaId || "home"; this.fade = 0; this.fadeTask = null; this.busy = false;
    this.houseLevel = Math.max(1, Math.min(3, economy.state.flags?.house_level || 1)); this._houseSprite = drawHouse(this.houseLevel); this._cart = drawCart(); this._ping = drawMarker("ping"); this._sparkle = drawMarker("sparkle");
    this._facSprites = new Map(); this._construct = new Map(); this.npc = null;
    this.setAppearanceSheet(appearance); this.grind = new Grinder(this);
    const st = this.eco.state, w = this.world, sp = st.position && Number.isFinite(st.position.x) ? st.position : { x: (w.spawn.c + 0.5) * w.tile, y: (w.spawn.r + 0.5) * w.tile };
    this.player.x = sp.x; this.player.y = sp.y;
    this._bind(); this.resize();
    this.refreshFacilities();
    this.offChange = this.eco.on("change", () => this.refreshFacilities());
  }
  setAppearanceSheet(spec) { this.player.sheet = buildSheet(this.kit, spec, { scale: this.opts?.sheetScale || 0.8 }); }
  dirFrom(dx, dy) { return dirFromVec(dx, dy); }
  _fpsTick(dt) { this._fa = (this._fa || 0) * 0.9 + (1 / dt) * 0.1; const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(6, 70, 64, 20); c.fillStyle = "#fff"; c.font = "12px monospace"; c.fillText(Math.round(this._fa) + " fps", 12, 84); }
  destroy() { this.running = false; cancelAnimationFrame(this._raf); this.offChange?.(); this.cv.removeEventListener("pointerdown", this._pd); this.cv.removeEventListener("pointerup", this._pu); window.removeEventListener("resize", this._rs); this._ro?.disconnect(); }
  pauseLoop() { this.running = false; cancelAnimationFrame(this._raf); }   // render + simulation stop together (TV bubble hides the WebView); start() resumes
  start() { if (this.running) return; this.running = true; this._last = performance.now(); const loop = (t) => { if (!this.running) return; const minDt = 1000 / (this.opts?.fps || 60) - 2; if (t - this._last < minDt) { this._raf = requestAnimationFrame(loop); return; } const dt = Math.min(0.05, (t - this._last) / 1000); this._last = t; this.update(dt); this.draw(); if (this.opts?.showFps) this._fpsTick(dt); this._raf = requestAnimationFrame(loop); }; this._raf = requestAnimationFrame(loop); this._saveT = 0; }

  // ------------------------------------------------------------ input
  _bind() {
    let down = null;
    this._pd = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this._pu = (e) => { if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (moved > 12) return; const r = this.cv.getBoundingClientRect(); this.onTap(e.clientX - r.left, e.clientY - r.top); };
    this.cv.addEventListener("pointerdown", this._pd); this.cv.addEventListener("pointerup", this._pu);
    this._rs = () => this.resize(); window.addEventListener("resize", this._rs); if (typeof ResizeObserver !== "undefined") { this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(this.cv); }
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(this.opts?.dprCap || 2.5, window.devicePixelRatio || 1); this.vw = r.width || 390; this.vh = r.height || 780; this.dpr = dpr;
    this.cv.width = Math.round(this.vw * dpr); this.cv.height = Math.round(this.vh * dpr); this.zoom = Math.max(0.8, this.vw / 460);
  }
  screenToWorld(sx, sy) { return { x: this.cam.x + sx / this.zoom, y: this.cam.y + sy / this.zoom }; }

  onTap(sx, sy) {
    if (this.busy || this.lock || this.ui.blocking?.()) return;
    if (this.grind.on) this.grind.setOn(false, "manual");
    const p = this.screenToWorld(sx, sy), w = this.world, T = w.tile;
    if (this.ghost) { this.moveGhost(Math.floor(p.x / T), Math.floor(p.y / T)); return; }
    this.cancelAction();
    // 1. merchant / cart
    if (this.cartRect && p.x > this.cartRect.x && p.x < this.cartRect.x + this.cartRect.w && p.y > this.cartRect.y && p.y < this.cartRect.y + this.cartRect.h) return this.goTo({ kind: "merchant", x: this.cartRect.cx, y: this.cartRect.cy + 30 }, () => (this.ui.talkMerchant ? this.ui.talkMerchant() : this.ui.openMerchant()));
    // 1b. NPCs (villagers, class master ...)
    for (const n of w.npcs || []) if (n.x != null && Math.abs(p.x - n.x) < 36 && p.y > n.y - 130 && p.y < n.y + 14) return this.goTo({ kind: "npc", x: n.x, y: n.y + 38 }, () => this.ui.talkNpc?.(n));
    // 2. home / facilities
    const hs = this._houseSprite, hx = w.home ? w.home.x - hs.w / 2 : 0, hy = w.home ? w.home.y - hs.h + 10 : 0;
    if (w.home && p.x > hx && p.x < hx + hs.w && p.y > hy + 60 && p.y < w.home.y + 20) return this.goTo({ x: w.home.x, y: w.home.y + 28 }, () => this.ui.openHome());
    if (w.home) for (const f of this.eco.facilities()) { const r = this.facRect(f); if (r && p.x > r.x && p.x < r.x + r.w && p.y > r.y + r.h * 0.25 && p.y < r.y + r.h) return this.goTo({ x: r.cx, y: r.y + r.h + 18 }, () => this.ui.openFacility(f.uid)); }
    // 3. gatherable props (closest by pivot, generous box)
    let best = null, bd = 1e9;
    for (const pr of w.props) {
      if (!pr.node || this.isHidden(pr)) continue; const dx = p.x - pr.x, dy = p.y - (pr.y - pr.h * 0.4);
      if (Math.abs(dx) < Math.max(34, pr.w * 0.5) && dy > -pr.h * 0.62 && dy < pr.h * 0.62) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = pr; } }
    }
    if (best) return this.gatherProp(best);
    // 4. water -> fish / draw
    const c = Math.floor(p.x / T), r = Math.floor(p.y / T), t = w.terrainAt(c, r);
    if (t === 4 || t === 7 || t === 5) return this.fishAt(c, r, t === 7 ? "pond" : "river");
    // 5. walk
    this.walkTo(c, r); this.markers.push({ x: p.x, y: p.y, t: 0 });
  }

  // ------------------------------------------------------------ pathfinding
  walkable(c, r) { const w = this.world; return c >= 0 && r >= 0 && c < w.cols && r < w.rows && !this._blockedNow(c, r); }
  _blockedNow(c, r) {
    const w = this.world; if (w.blocked[r * w.cols + c]) { // a tile blocked only by a depleted prop is free
      const pr = this._propTile.get(r * w.cols + c); if (pr && pr.every((x) => this.isHidden(x))) return !!this._baseBlocked[r * w.cols + c]; return true; }
    return !!this._facBlocked?.[r * w.cols + c];
  }
  _indexProps() {
    const w = this.world; this._propTile = new Map(); this._baseBlocked = new Uint8Array(w.cols * w.rows);
    for (const pr of w.props) if (pr.blocking && pr.c >= 0 && pr.r >= 0 && pr.c < w.cols && pr.r < w.rows) { const k = pr.r * w.cols + pr.c; (this._propTile.get(k) || this._propTile.set(k, []).get(k)).push(pr); }
    // tiles that are blocked by terrain (water, far bank, home) rather than by props
    const clone = new Uint8Array(w.blocked); for (const [k] of this._propTile) clone[k] = 0; for (let i = 0; i < clone.length; i++) this._baseBlocked[i] = clone[i];
    // `blocked` for prop tiles is only cleared if no terrain reason: recompute from terrain
  }
  findPath(sx, sy, tc, tr) {
    const w = this.world, { cols, rows, tile: T } = w, sc = Math.floor(sx / T), sr = Math.floor(sy / T);
    if (!this.walkable(tc, tr)) { // nearest walkable tile to the target
      let best = null, bd = 1e9; for (let r = tr - 3; r <= tr + 3; r++) for (let c = tc - 3; c <= tc + 3; c++) if (this.walkable(c, r)) { const d = Math.hypot(c - tc, r - tr); if (d < bd) { bd = d; best = [c, r]; } } if (!best) return null; [tc, tr] = best; }
    const key = (c, r) => r * cols + c, open = [[0, sc, sr]], g = new Map([[key(sc, sr), 0]]), from = new Map(), h = (c, r) => Math.hypot(c - tc, r - tr);
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]); const [, c, r] = open.shift(); if (c === tc && r === tr) break;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue; const nc = c + dc, nr = r + dr; if (!this.walkable(nc, nr)) continue;
        if (dc && dr && (!this.walkable(c + dc, r) || !this.walkable(c, r + dr))) continue;
        const ng = g.get(key(c, r)) + Math.hypot(dc, dr); if (ng < (g.get(key(nc, nr)) ?? 1e9)) { g.set(key(nc, nr), ng); from.set(key(nc, nr), [c, r]); open.push([ng + h(nc, nr), nc, nr]); }
      }
    }
    if (!g.has(key(tc, tr))) return null;
    const path = []; let cur = [tc, tr]; while (cur && !(cur[0] === sc && cur[1] === sr)) { path.push({ x: (cur[0] + 0.5) * T, y: (cur[1] + 0.5) * T }); cur = from.get(key(cur[0], cur[1])); } return path.reverse();
  }
  walkTo(c, r, then) { const path = this.findPath(this.player.x, this.player.y, c, r); if (!path) { this.ui.toast("Can't walk there."); return false; } this.player.path = path; this.player.then = then || null; return true; }
  goTo(target, then) { const T = this.world.tile; if (!this.walkTo(Math.floor(target.x / T), Math.floor(target.y / T), then)) return; this.markers.push({ x: target.x, y: target.y, t: 0 }); }

  // ------------------------------------------------------------ gathering
  isHidden(pr) { return this.eco.isNodeDepleted("p" + pr.uid); }
  gatherProp(pr) {
    const uid = "p" + pr.uid, plan = this.eco.planGather(pr.node, { propUid: uid, water: "river" });
    if (!plan.ok) { this.ui.toast(this._why(plan)); this.selected = null; return; }
    // stand beside it (on the side facing the camera if possible)
    const T = this.world.tile, c = Math.floor(pr.x / T), r = Math.floor(pr.y / T), opts = [[0, 1], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
    let best = null, bd = 1e9; for (const [dc, dr] of opts) { const tc = c + dc, tr = r + dr; if (!this.walkable(tc, tr)) continue; const d = Math.hypot((tc + 0.5) * T - this.player.x, (tr + 0.5) * T - this.player.y); if (d < bd) { bd = d; best = [tc, tr]; } }
    if (!best) { this.ui.toast("No room to reach it."); return; }
    this.selected = pr;
    if (!this.walkTo(best[0], best[1], () => this.beginAction(plan, pr, pr.node, uid))) this.selected = null;
  }
  fishAt(c, r, water) {
    const plan = this.eco.planGather({ kind: "fish", variant: "" }, { propUid: "anon", water }); if (!plan.ok) { this.ui.toast(this._why(plan)); return; }
    // nearest walkable bank tile
    let best = null, bd = 1e9; for (let rr = r - 4; rr <= r + 4; rr++) for (let cc = c - 4; cc <= c + 4; cc++) { if (!this.walkable(cc, rr)) continue; const t = this.world.terrainAt(cc, rr); if (t === 4 || t === 7) continue; const d = Math.hypot(cc - c, rr - r); if (d < bd) { bd = d; best = [cc, rr]; } }
    if (!best || bd > 4.5) { this.ui.toast("Too far from the water."); return; }
    const T = this.world.tile; this.player.faceTarget = { x: (c + 0.5) * T, y: (r + 0.5) * T };
    this.walkTo(best[0], best[1], () => this.beginAction(plan, null, { kind: "fish", variant: "" }, "anon", water));
  }
  beginAction(plan, pr, node, uid, water) {
    const p = this.player; p.moving = false; const tx = pr ? pr.x : p.faceTarget?.x ?? p.x, ty = pr ? pr.y : p.faceTarget?.y ?? p.y + 10;
    p.dir = dirFromVec(tx - p.x, ty - p.y); p.action = { plan, pr, node, uid, water, t: 0, dur: plan.seconds, label: plan.label };
  }
  cancelAction() { this.player.action = null; this.player.then = null; }
  _why(plan) { if (plan.reason === "missing_tool") return plan.missing?.[0] || "You need a tool."; if (plan.reason === "bag_full") return "Your bag is full."; if (plan.reason === "depleted") return "Nothing left here for now."; return plan.missing?.[0] || "Nothing to gather here."; }
  _finishAction() {
    const a = this.player.action; this.player.action = null;
    const res = this.eco.commitGather(a.plan, a.uid);
    if (!res.ok) { this.ui.toast(res.reason === "bag_full" ? "Your bag is full." : "Couldn't gather."); return; }
    if (a.pr?.sway) this.burstLeaves(a.pr, /^tree_/.test(a.pr.name) ? 16 : 6);
    const txt = res.gained.map((g) => `+${g.quantity} ${this.catalog.itemName(g.item_id)}`).join(", "); this.ui.toast(txt); this.ui.sfx?.("gather");
    this.markers.push({ x: this.player.x, y: this.player.y - 70, t: 0, spark: true });
  }

  // ------------------------------------------------------------ building
  facRect(f) {
    const T = this.world.tile, spr = this.facSprite(f); if (!spr) return null; const x = (f.c + f.w / 2) * T - spr.w / 2, y = (f.r + f.h) * T - spr.h + 6;
    return { x, y, w: spr.w, h: spr.h, cx: (f.c + f.w / 2) * T, by: (f.r + f.h) * T };
  }
  facSprite(f) {
    const def = f.def || this.catalog.facilityById.get(f.facility_id); if (!def) return null;
    if (f.status === "building" || f.status === "upgrading") { const k = f.w + "x" + f.h; if (!this._construct.has(k)) { const c = drawConstructionSite(f.w, f.h); this._construct.set(k, { canvas: c, w: c.width, h: c.height }); } return this._construct.get(k); }
    const k = f.facility_id + ":" + f.level; if (!this._facSprites.has(k)) this._facSprites.set(k, drawFacility(def, f.level)); return this._facSprites.get(k);
  }
  refreshFacilities() {
    const lv = Math.max(1, Math.min(3, this.eco.state.flags?.house_level || 1)); if (lv !== this.houseLevel) { this.houseLevel = lv; this._houseSprite = drawHouse(lv); }
    const w = this.world; this._facBlocked = new Uint8Array(w.cols * w.rows);
    if (w.home) for (const f of this.eco.state.facilities) for (let r = f.r; r < f.r + f.h; r++) for (let c = f.c; c < f.c + f.h * 0 + f.w; c++) if (c >= 0 && r >= 0 && c < w.cols && r < w.rows) this._facBlocked[r * w.cols + c] = 1;
    if (!this._propTile) this._indexProps();
  }
  canPlace(c, r, fw, fh) {
    const w = this.world, cl = w.claim; if (c < cl.c0 || r < cl.r0 || c + fw - 1 > cl.c1 || r + fh - 1 > cl.r1) return false;
    for (let rr = r; rr < r + fh; rr++) for (let cc = c; cc < c + fw; cc++) {
      const t = w.terrainAt(cc, rr); if (t === 4 || t === 5 || t === 7 || t === 3 || t === 9) return false;
      if (this._facBlocked[rr * w.cols + cc]) return false;
      const hc = w.home; if (cc >= hc.c && cc < hc.c + hc.fc && rr >= hc.r && rr < hc.r + hc.fr) return false;
      for (const pr of w.props) if (pr.node && pr.c === cc && pr.r === rr && !this.isHidden(pr)) return false;
      for (const pr of w.props) if (pr.blocking && pr.c === cc && pr.r === rr && !this.isHidden(pr)) return false;
    }
    return true;
  }
  beginPlacing(facility) {
    const fp = facilityFootprint(facility), p = this.player, T = this.world.tile;
    this.ghost = { facility, w: fp.w, h: fp.h, c: Math.floor(p.x / T), r: Math.floor(p.y / T) + 1, spr: drawFacility(facility, 1) }; this.ghost.ok = this.canPlace(this.ghost.c, this.ghost.r, fp.w, fp.h);
  }
  moveGhost(c, r) { const g = this.ghost; g.c = c - Math.floor(g.w / 2); g.r = r - g.h + 1; g.ok = this.canPlace(g.c, g.r, g.w, g.h); }
  confirmPlacing() {
    const g = this.ghost; if (!g) return { ok: false }; if (!g.ok) return { ok: false, reason: "blocked" };
    const res = this.eco.placeFacility(g.facility.facility_id, g.c, g.r, { w: g.w, h: g.h, canPlace: (c, r, w, h) => this.canPlace(c, r, w, h) });
    if (res.ok) this.ghost = null; return res;
  }
  cancelPlacing() { this.ghost = null; }

  // ------------------------------------------------------------ update / draw
  update(dt) {
    this.time += dt; this.dt = dt; this._tickFade(dt); const p = this.player, w = this.world; if (!this.busy && !this.lock) this.grind.update(dt); this.updateParts(dt); this._checkExits(dt);
    { const pr = p.action?.pr; if (pr?.sway) { pr.shake = 1; this._leafT = (this._leafT || 0) - dt; if (this._leafT <= 0) { this._leafT = 0.32; if (/^tree_/.test(pr.name)) this.burstLeaves(pr, 2); } } }
    if (p.action) {
      p.action.t += dt; p.moving = false;
      if (p.action.t >= p.action.dur) this._finishAction();
    } else if (p.path.length) {
      const n = p.path[0], dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy), step = SPEED * dt;
      p.dir = dirFromVec(dx, dy); p.moving = true;
      if (d <= step) { p.x = n.x; p.y = n.y; p.path.shift(); } else { p.x += dx / d * step; p.y += dy / d * step; }
      if (!p.path.length) { p.moving = false; const f = p.then; p.then = null; if (f) f(); }
    } else p.moving = false;
    p.frame += dt * (p.moving ? (p.sheet?.stride ? 7.5 : 9) : 1.6);
    const cx = p.x - this.vw / this.zoom / 2, cy = p.y - 40 - this.vh / this.zoom / 2;
    const maxX = w.width - this.vw / this.zoom, maxY = w.height - this.vh / this.zoom;
    this.cam.x += (Math.max(0, Math.min(maxX, cx)) - this.cam.x) * Math.min(1, dt * 7); this.cam.y += (Math.max(0, Math.min(maxY, cy)) - this.cam.y) * Math.min(1, dt * 7);
    for (const m of this.markers) m.t += dt; this.markers = this.markers.filter((m) => m.t < 1.0);
    this._saveT += dt; if (this._saveT > 6) { this._saveT = 0; this.eco.state.position = { x: Math.round(p.x), y: Math.round(p.y) }; this.eco.tick(); this.eco.save(); }
    this.ui.frame?.(dt);
    // merchant arrival
    const m = this.eco.merchant(); this._merchantHere = !!m.present;
    if (m.present && !this._cartPlaced) { this._cartPlaced = true; }
  }
  sun() { const m = minuteOfDay(this.eco.now()) / 60, s = Math.max(-1, Math.min(1, (m - 12) / 6.5)), a = m < 5.5 || m > 19.5 ? 0 : Math.min(1, (m - 5.5) / 1.5, (19.5 - m) / 1.5); return { shx: 0.55 * s, shy: 0.14 + 0.16 * Math.abs(s), a: a * (this.world.amb?.shadow ?? 1) }; }
  // falling-leaf particles (tree gathering, bushes)
  burstLeaves(pr, n) { const col = /^tree_/.test(pr.name) ? A.leafColourOf(pr.name) : "#8fb05a", P = this.parts || (this.parts = []); for (let i = 0; i < n && P.length < 120; i++) P.push({ x: pr.x + (Math.random() - 0.5) * pr.w * 0.5, y: pr.y - pr.h * (0.45 + Math.random() * 0.45), vx: -14 + Math.random() * 46, vy: -18 + Math.random() * 26, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, t: 0, life: 1.8 + Math.random() * 1.2, col, s: 0.8 + Math.random() * 0.5, g: Math.random() * 6 }); }
  updateParts(dt) { const P = this.parts; if (!P?.length) return; for (const q of P) { q.t += dt; q.vy = Math.min(46, q.vy + 55 * dt); q.vx += (Math.sin(this.time * 2 + q.g) * 26 - q.vx * 0.4) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; } this.parts = P.filter((q) => q.t < q.life); }
  drawParts(c) { const P = this.parts; if (!P?.length) return; c.save(); for (const q of P) { c.globalAlpha = Math.min(1, (q.life - q.t) / 0.5); A.drawLeaf(c, q.x, q.y, q.rot, q.s, q.col, Math.cos(this.time * 3 + q.g)); } c.restore(); }
  tint() { // multiply colour for time of day
    const sim = this.eco.now(), m = minuteOfDay(sim) / 60, k = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)), day = [255, 255, 255], dusk = [255, 200, 165], night = [95, 110, 175], dawn = [255, 214, 185];
    if (m < 4.5) return night; if (m < 6) return k(night, dawn, (m - 4.5) / 1.5); if (m < 8) return k(dawn, day, (m - 6) / 2); if (m < 16.5) return day;
    if (m < 18.5) return k(day, dusk, (m - 16.5) / 2); if (m < 20.5) return k(dusk, night, (m - 18.5) / 2); return night;
  }
  /** camera shake: amplitude in screen px; decays fast; stacks by taking the larger one (so a swarm of tiny hits never turns into a quake) */
  kick(amp) { if (this.shakeOff) return; this.shake = Math.min(7, Math.max(this.shake || 0, amp)); }
  draw() {
    const sk = this.shake || 0; if (sk < 0.06) { this.shake = 0; return this._draw(); }
    const z = this.zoom, ox = (Math.random() - 0.5) * 2 * sk / z, oy = (Math.random() - 0.5) * 2 * sk / z; this.cam.x += ox; this.cam.y += oy; this.shake = sk * Math.exp(-(this.dt || 0.016) * 9);
    try { this._draw(); } finally { this.cam.x -= ox; this.cam.y -= oy; }
  }
  _draw() {
    const c = this.ctx, w = this.world, z = this.zoom, dpr = this.dpr, vw = this.vw / z, vh = this.vh / z, cam = this.cam;
    c.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * dpr * z, -cam.y * dpr * z); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.fillStyle = "#2a2a22"; c.fillRect(cam.x - 2, cam.y - 2, vw + 4, vh + 4);
    c.drawImage(w.ground, cam.x, cam.y, vw, vh, cam.x, cam.y, vw, vh);
    const view = { x0: cam.x, y0: cam.y, x1: cam.x + vw, y1: cam.y + vh }, sun = this.sun(), hidden = (pr) => this.isHidden(pr);
    A.drawWater(c, w, this.time, view); A.drawGrass(c, w, this.time, view);
    // tile highlight for build mode
    if (this.ghost && w.claim) { const T = w.tile, cl = w.claim; c.save(); c.globalAlpha = 0.22; c.fillStyle = "#f2e08a"; c.fillRect(cl.c0 * T, cl.r0 * T, (cl.c1 - cl.c0 + 1) * T, (cl.r1 - cl.r0 + 1) * T); c.restore(); }
    // soft shadows on the ground: they follow the sun, sway with the canopy and fade at night
    A.drawShadows(c, w, this.time, view, sun, hidden); if (w.home) { const h0 = this._houseSprite; A.drawSilShadow(c, h0.canvas, w.home.x, w.home.y + 10, h0.w, h0.h, sun, 0.4); for (const f of this.eco.facilities()) { const r = this.facRect(f), sp = r && this.facSprite(f); if (sp) A.drawSilShadow(c, sp.canvas, r.cx, r.y + r.h, r.w, r.h, sun, 0.35); } }
    // entity list (y-sorted)
    const list = [], pad = 120, x0 = cam.x - pad, x1 = cam.x + vw + pad, y0 = cam.y - pad, y1 = cam.y + vh + pad + 160;
    for (const pr of w.props) { if (pr.x < x0 || pr.x > x1 || pr.y < y0 || pr.y > y1 + 120) continue; if (pr.node && this.isHidden(pr)) continue; list.push({ y: pr.y, f: () => { A.drawProp(c, pr, this.time, this.dt || 0.016, this.player); c.save(); c.translate(pr.x, pr.y); if (this.selected === pr) { c.globalAlpha = 0.5; c.strokeStyle = "#fff4cf"; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -4, pr.w * 0.4, 9, 0, 0, 6.3); c.stroke(); } c.restore(); } }); }
    const hs = this._houseSprite; if (w.home) list.push({ y: w.home.y, f: () => c.drawImage(hs.canvas, w.home.x - hs.w / 2, w.home.y - hs.h + 10) });
    if (w.home) for (const f of this.eco.facilities()) { const r = this.facRect(f); if (!r) continue; const spr = this.facSprite(f); list.push({ y: r.by, f: () => { c.drawImage(spr.canvas, r.x, r.y, r.w, r.h); if (f.status === "ready" && (Object.keys(f.buffer || {}).length || f.process?.done)) c.drawImage(this._sparkle, r.cx - 16, r.y - 12, 32, 32); } }); }
    // merchant cart + npc
    const m = this.eco.merchant(); this.cartRect = null;
    if (w.home && m.present) { const cx = 17.5 * w.tile, cy = 26.4 * w.tile, cw = this._cart.w, ch = this._cart.h, x = cx - cw / 2, y = cy - ch + 14; this.cartRect = { x, y, w: cw, h: ch, cx, cy }; list.push({ y: cy, f: () => { c.drawImage(this._cart.canvas, x, y); this.ui.drawNpcLabel?.(c, cx, y - 6, m.name); } }); }
    if (w.exits?.length) this.drawExits(c, w);
    for (const n of w.npcs || []) if (n.x != null) list.push({ y: n.y, f: () => this.drawNpc(c, n) });
    list.push(...this.grind.entities(c)); list.push({ y: this.player.y, f: () => this.drawPlayer(c) });
    list.sort((a, b) => a.y - b.y); for (const e of list) e.f();
    A.drawTreeLeaves(c, w, this.time, view, hidden); this.drawParts(c); this.grind.drawBars(c); this.grind.drawFx(c);
    // ghost footprint
    if (this.ghost) { const g = this.ghost, T = w.tile; c.save(); c.globalAlpha = 0.6; c.drawImage(g.spr.canvas, (g.c + g.w / 2) * T - g.spr.w / 2, (g.r + g.h) * T - g.spr.h + 6); c.globalAlpha = 0.45; c.fillStyle = g.ok ? "#6fdc8a" : "#e0584a"; c.fillRect(g.c * T, g.r * T, g.w * T, g.h * T); c.restore(); }
    // markers
    for (const mk of this.markers) { const k = mk.t / 1.0; c.save(); c.globalAlpha = 1 - k; if (mk.spark) c.drawImage(this._sparkle, mk.x - 20, mk.y - 20 - k * 30, 40, 40); else c.drawImage(this._ping, mk.x - 22 - k * 10, mk.y - 22 - k * 6, 44 + k * 20, 44 + k * 12); c.restore(); }
    if (sun.a > 0.05) A.drawBlobs(c, w, this.time, view, { n: 7, rgb: "36,48,92", a: 0.11 * sun.a, speed: 14, rx: 380, ry: 210, seed: 3 });   // drifting cloud shadows
    A.drawAmbient(c, this.time, view, w.amb); if (w.amb?.fog) A.drawBlobs(c, w, this.time, view, { n: 20, rgb: w.amb.fogRgb || "226,232,238", a: w.amb.fog, speed: 7, rx: 300, ry: 140, seed: 7 });
    // time-of-day tint
    c.setTransform(dpr, 0, 0, dpr, 0, 0); const t = this.tint(); if (t[0] < 250 || t[2] < 250) { c.save(); c.globalCompositeOperation = "multiply"; c.fillStyle = `rgb(${t[0]},${t[1]},${t[2]})`; c.fillRect(0, 0, this.vw, this.vh); c.restore(); }
    if (w.amb?.tone) { const [tr, tg, tb, ta] = w.amb.tone; c.save(); c.fillStyle = `rgba(${tr},${tg},${tb},${ta})`; c.fillRect(0, 0, this.vw, this.vh); c.restore(); }
    // vignette
    const g2 = c.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.45, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.75); g2.addColorStop(0, "rgba(20,14,28,0)"); g2.addColorStop(1, "rgba(20,14,28,0.32)"); c.fillStyle = g2; c.fillRect(0, 0, this.vw, this.vh);
    if (this.fade > 0.003) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = `rgba(8,6,14,${this.fade})`; c.fillRect(0, 0, this.vw, this.vh); }
    // action ring (screen space)
    const a = this.player.action; if (a) { const sx = (this.player.x - cam.x) * z, sy = (this.player.y - 124 - cam.y) * z, k = Math.min(1, a.t / a.dur); c.save(); c.lineWidth = 5; c.strokeStyle = "rgba(20,14,28,0.55)"; c.beginPath(); c.arc(sx, sy, 20, 0, 6.2832); c.stroke(); c.strokeStyle = "#f2d889"; c.beginPath(); c.arc(sx, sy, 20, -1.5708, -1.5708 + 6.2832 * k); c.stroke(); c.fillStyle = "#fff4cf"; c.font = "600 11px system-ui"; c.textAlign = "center"; c.fillText(a.label || "", sx, sy - 28); c.restore(); }
  }
  drawPlayer(c) {
    const p = this.player, s = p.sheet, [row, mirror] = DIR_ROW[p.dir] || DIR_ROW.S, [cw, ch] = s.cell, sc = CHAR_H / (ch * 236 / 300), still = !p.moving && !p.action, T = this.time;
    let col; if (p.moving) col = s.idleFrames + (Math.floor(p.frame) % s.walkFrames); else if (p.action) col = s.idleFrames; else col = 0;
    const dw = cw * sc, dh = ch * sc, feet = s.feet || 0.973, b = (Math.sin(T * 2.3) + 1) / 2, step = p.moving ? Math.abs(Math.sin(p.frame * (s.stride ? 0.42 : 0.35) * Math.PI)) : 0;
    // soft ground shadow: breathes with the body when standing, pulses with each step when walking
    this._hd = { hy: p.y - dh * feet + dh * 0.16, u: dh }; c.save(); c.fillStyle = "rgba(30,24,40,0.3)"; c.beginPath(); c.ellipse(p.x, p.y, 22 + b * 0.9 - step * 2.5, 8 + b * 0.25 - step * 0.6, 0, 0, 6.3); c.fill(); this._slots(c, p, "back"); if (this.meditating) this._drawMeditate(c, p);
    const lg = (p.lunge || 0) * 9, lv = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1], SE: [.7, .7], SW: [-.7, .7], NE: [.7, -.7], NW: [-.7, -.7] }[p.dir] || [0, 0];
    c.translate(p.x + lv[0] * lg, p.y + lv[1] * lg * 0.6 - dh * feet + (p.action ? Math.sin(p.action.t * 12) * 1.5 : 0));
    if (mirror) c.scale(-1, 1);
    if (still || p.action) drawBreathing(c, s.canvas, col * cw, row * ch, cw, ch, -dw / 2, 0, dw, dh, s.hip || 0.8, T + (p.seed || 0), p.action ? 0.6 : 1);
    else c.drawImage(s.canvas, col * cw, row * ch, cw, ch, -dw / 2, 0, dw, dh);
    c.restore(); this._slots(c, p, "front");
  }
  _slots(c, p, half) {   // the Guanghuan (art/guanghuan.js): plain shell above the head once awakened, then one orbital layer per absorbed Origin
    const cu = this.eco.state.flags?.cult, hd = this._hd; if (!cu?.innate || !hd) return; const a = cu.absorb, prog = a ? Math.min(1, (this.eco.now() - a.t0) / a.dur) : 0, fl = Math.max(0, 1 - (this.time - (this.originFlash ?? -9)) / 1.6);
    cu.innateCol ||= elementOf(cu.innate).col; drawGuanghuan(c, p.x, hd.hy, hd.u, guanghuanItems(cu, prog), this.time, half, fl);
  }

  // ------------------------------------------------------------ NPCs: standing figures with the idle breathing, tap to talk
  _placeNpcs(w) {
    const T = w.tile; for (const n of w.npcs || []) { if (n.x != null) continue; let best = null; for (let d = 0; d < 9 && !best; d++) for (let dc = -d; dc <= d && !best; dc++) for (let dr = -d; dr <= d && !best; dr++) { if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue; const c = n.c + dc, r = n.r + dr; if (this.walkable(c, r)) best = { x: (c + 0.5) * T, y: (r + 0.5) * T }; } if (best) { n.x = best.x; n.y = best.y; } }
  }
  _drawMeditate(c, p) {   // glowing slots + rising motes while a Origin is being absorbed
    const T = this.time; c.save();
    for (let i = 0; i < 9; i++) { const k = ((T * 0.3 + i * 0.111) % 1), a = i * 2.4 + T * 0.6; c.fillStyle = `rgba(255,236,170,${(1 - k) * 0.85})`; c.beginPath(); c.arc(p.x + Math.cos(a) * (18 + i * 2.5), p.y - k * 120, 1.6 + (1 - k) * 1.4, 0, 6.3); c.fill(); }
    const g = c.createRadialGradient(p.x, p.y - 40, 4, p.x, p.y - 40, 70); g.addColorStop(0, "rgba(255,214,120,.28)"); g.addColorStop(1, "rgba(255,214,120,0)"); c.fillStyle = g; c.fillRect(p.x - 80, p.y - 120, 160, 160); c.restore();
  }
  drawNpc(c, n) {
    const key = n.id; if (!this._npcCell.has(key)) { if (!this.kit.has(n.model)) return; this._npcCell.set(key, this.kit.render({ model: n.model, colors: n.colors || {}, face: n.face }, n.view || "S")); }
    const cell = this._npcCell.get(key), sc = CHAR_H / (cell.height * 236 / 300), dw = cell.width * sc, dh = cell.height * sc, T = this.time;
    c.save(); c.fillStyle = "rgba(30,24,40,0.3)"; c.beginPath(); c.ellipse(n.x, n.y, 22, 8, 0, 0, 6.3); c.fill(); c.translate(n.x, n.y - dh * 0.973); drawBreathing(c, cell, 0, 0, cell.width, cell.height, -dw / 2, 0, dw, dh, this.kit.hipRow(n.model) / cell.height, T + n.x * 0.01, 1); c.restore();
    this.ui.drawNpcLabel?.(c, n.x, n.y - CHAR_H - 14, n.name);
  }

  // ------------------------------------------------------------ areas (fade out -> load -> fade in)
  drawExits(c, w) {
    const T = w.tile, t = this.time; c.save(); c.textAlign = "center"; c.lineJoin = "round";
    for (const e of w.exits) {
      if (!e.to) continue; const x0 = e.c0 * T, y0 = e.r0 * T, x1 = (e.c1 + 1) * T, y1 = (e.r1 + 1) * T, pulse = 0.5 + 0.5 * Math.sin(t * 2.4), L = 96;
      let rx = x0, ry = y0, rw = x1 - x0, rh = y1 - y0, gx0 = 0, gy0 = 0, gx1 = 0, gy1 = 0, tx = (x0 + x1) / 2, ty = (y0 + y1) / 2;
      if (e.side === "n") { rh = L; gy0 = ry; gy1 = ry + L; ty = ry + 52; } else if (e.side === "s") { ry = y1 - L; rh = L; gy0 = y1; gy1 = ry; ty = y1 - 62; }
      else if (e.side === "w") { rw = L; gx0 = rx; gx1 = rx + L; tx = rx + 56; } else { rx = x1 - L; rw = L; gx0 = x1; gx1 = rx; tx = x1 - 56; }
      const g = c.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, `rgba(255,244,207,${0.34 + 0.16 * pulse})`); g.addColorStop(1, "rgba(255,244,207,0)"); c.fillStyle = g; c.fillRect(rx, ry, rw, rh);
      const ar = { n: "▲", s: "▼", e: "▶", w: "◀" }[e.side], label = `${ar} ${e.label}`; c.globalAlpha = 0.72 + 0.28 * pulse; c.font = "800 13px system-ui"; c.lineWidth = 4; c.strokeStyle = "rgba(30,20,36,.85)"; c.strokeText(label, tx, ty); c.fillStyle = "#fff4cf"; c.fillText(label, tx, ty); c.globalAlpha = 1;
    }
    c.restore();
  }
  _fadeTo(to, dur) { return new Promise((res) => { this.fadeTask = { from: this.fade, to, dur: Math.max(0.01, dur), t: 0, res }; }); }
  _tickFade(dt) { const f = this.fadeTask; if (!f) return; f.t += dt; const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k); this.fade = f.from + (f.to - f.from) * e; if (k >= 1) { this.fadeTask = null; f.res(); } }
  /** switch the world: opts = { pos, spot, instant, then } ; side = the side of the new map the hero arrives on */
  async travel(areaId, side, opts = {}) {
    if (this.busy || !this.areas || (areaId === this.areaId && !opts.force)) return false;
    this.busy = true; this.cancelAction(); this.player.path = []; this.player.moving = false; if (this.grind.on) this.grind.setOn(false);
    try {
      if (opts.instant) this.fade = 1; else await this._fadeTo(1, 0.38);
      await new Promise((r) => setTimeout(r, 40));
      const world = await this.areas.get(areaId); if (!this.running) return false;
      this._applyWorld(world, areaId, side, opts);
      this.ui.areaTitle?.(areaId, world);
      await this._fadeTo(0, 0.55);
    } finally { this.busy = false; this.fade = this.fadeTask ? this.fade : 0; }
    opts.then?.(); return true;
  }
  _applyWorld(world, areaId, side, opts = {}) {
    const p = this.player, T = world.tile; this.world = world; this.areaId = areaId; this.markers = []; this.selected = null; this.ghost = null; this.parts = []; this.cartRect = null; this._propTile = null; this._facBlocked = null;
    this.grind.clearMobs(); this.refreshFacilities(); this._placeNpcs(world);
    let pos = opts.pos; if (opts.spot === "homeDoor" && world.home) pos = { x: world.home.x, y: world.home.y + 46 };
    if (!pos) { const en = world.entries?.[side] || world.entries?.s || world.spawn; pos = { x: (en.c + 0.5) * T, y: (en.r + 0.5) * T }; }
    p.x = pos.x; p.y = pos.y; p.path = []; p.moving = false; p.dir = side === "n" ? "S" : side === "s" ? "N" : side === "e" ? "W" : side === "w" ? "E" : p.dir;
    const z = this.zoom, vw = this.vw / z, vh = this.vh / z; this.cam.x = Math.max(0, Math.min(world.width - vw, p.x - vw / 2)); this.cam.y = Math.max(0, Math.min(world.height - vh, p.y - 40 - vh / 2));
    const f = this.eco.state.flags; f.area = areaId; this.eco.state.position = { x: Math.round(p.x), y: Math.round(p.y) }; this.eco.save?.();
    this._exitLock = 0.8;
  }
  _checkExits(dt) {
    const w = this.world; if (!w.exits?.length || this.busy) return; if (this._exitLock > 0) { this._exitLock -= dt; return; }
    const T = w.tile, c = Math.floor(this.player.x / T), r = Math.floor(this.player.y / T), OPP = { s: "n", n: "s", e: "w", w: "e" };
    for (const e of w.exits) if (e.to && c >= e.c0 && c <= e.c1 && r >= e.r0 && r <= e.r1) { this.travel(e.to, OPP[e.side]); return; }
  }
}
