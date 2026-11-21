// Auto-Grind: the hero hunts the chosen mob species on its own (seek -> fight -> loot -> next), rests when hurt and stops when it keeps losing.
// Pure game logic + small canvas drawing; economy rules (items, wallet) go through GameEconomy, numbers live in data/mobs.js.
import { ART, speciesById, rollLevel, mobHp, rewards, heroHit, mobHit, getHero, addExp, sizeOf, TIER_SIZE, TIER_RESPAWN, TIER_COUNT } from "./data/mobs.js";
import { statsOf, pointsOf, NODE_COST } from "./data/progression.js";
import { offerExtraction, resolveExtraction, elementOf, gateOf, cult } from "./data/realms.js";
import { SKILL, CLASS, skillRec, usable, ownsClass, rollBooks, addBooks, qiCost } from "./data/skills.js";
import { buildRig, drawMob } from "./art/mobs.js";
import { drawMonster, monsterSprite, topOf } from "./art/monsters.js";
import { zoneById, AREA_NAMES } from "./data/areas.js";


// ---- HP bar drawing (world space) -------------------------------------------------------------------------------------------------
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2))); };
const label = (c, s, x, y, font, fill, lw = 3) => { c.font = font; c.lineWidth = lw; c.strokeStyle = "rgba(30,20,36,.92)"; c.lineJoin = "round"; c.strokeText(s, x, y); c.fillStyle = fill; c.fillText(s, x, y); };
function fillBar(c, x, y, w, h, k, lag, g0, g1, r) {
  if (lag > k + 0.003) { c.fillStyle = "rgba(255,244,207,.88)"; rr(c, x, y, w * lag, h, r); c.fill(); }
  if (k > 0.002) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, g0); g.addColorStop(1, g1); c.fillStyle = g; rr(c, x, y, Math.max(1.5, w * k), h, r); c.fill(); c.fillStyle = "rgba(255,255,255,.3)"; rr(c, x + 1, y + 0.8, Math.max(0, w * k - 2), h * 0.36, r); c.fill(); }
}
function barMob(c, x, y, m, isTarget) {
  const w = 38, h = 5, k = Math.max(0, m.hp / m.max), lag = Math.max(0, m.lag / m.max);
  c.save(); c.textAlign = "center";
  rr(c, x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, 4); c.fillStyle = "rgba(30,20,36,.86)"; c.fill(); c.strokeStyle = "rgba(255,243,220,.5)"; c.lineWidth = 1; c.stroke();
  fillBar(c, x - w / 2, y, w, h, k, lag, "#ff8a78", "#d9453b", 2.5);
  label(c, "Lv " + m.lv + (isTarget ? "  " + m.sp.name : ""), x, y - 5, "700 9px system-ui", "#fff", 2.6);
  c.restore();
}
function barSub(c, x, y, m) {
  const w = 92, h = 8, k = Math.max(0, m.hp / m.max), lag = Math.max(0, m.lag / m.max);
  c.save(); c.textAlign = "center";
  label(c, `Lv ${m.lv}  ${m.sp.name}`, x, y - 7, "800 11px system-ui", "#f9e4a6");
  rr(c, x - w / 2 - 3, y - 3, w + 6, h + 6, 7); c.fillStyle = "rgba(30,20,36,.92)"; c.fill(); c.strokeStyle = "#e9c46a"; c.lineWidth = 1.8; c.stroke();
  fillBar(c, x - w / 2, y, w, h, k, lag, "#ffd27a", "#e0653a", 4);
  c.strokeStyle = "rgba(30,20,36,.55)"; c.lineWidth = 1; c.beginPath(); for (let i = 1; i < 4; i++) { c.moveTo(x - w / 2 + w * i / 4, y); c.lineTo(x - w / 2 + w * i / 4, y + h); } c.stroke();
  for (const s of [-1, 1]) { c.fillStyle = "#e9c46a"; c.strokeStyle = "#3b2c36"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + s * (w / 2 + 3), y + h / 2 - 5); c.lineTo(x + s * (w / 2 + 9), y + h / 2); c.lineTo(x + s * (w / 2 + 3), y + h / 2 + 5); c.lineTo(x + s * (w / 2 - 1), y + h / 2); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
function barBoss(c, x, y, m, T) {
  const w = 158, h = 13, k = Math.max(0, m.hp / m.max), lag = Math.max(0, m.lag / m.max);
  c.save(); c.textAlign = "center";
  label(c, m.sp.name.toUpperCase(), x, y - 9, "800 13px system-ui", "#ffb4a8", 3.4); label(c, `BOSS · Lv ${m.lv}`, x, y - 22, "800 9px system-ui", "#f2d889", 2.6);
  c.shadowColor = "rgba(255,80,70,.55)"; c.shadowBlur = 8 + 4 * Math.sin(T * 3); rr(c, x - w / 2 - 4, y - 4, w + 8, h + 8, 9); c.fillStyle = "rgba(24,14,30,.94)"; c.fill(); c.shadowBlur = 0;
  c.strokeStyle = "#e9c46a"; c.lineWidth = 2; c.stroke(); rr(c, x - w / 2 - 1, y - 1, w + 2, h + 2, 7); c.strokeStyle = "rgba(255,243,220,.35)"; c.lineWidth = 1; c.stroke();
  fillBar(c, x - w / 2, y, w, h, k, lag, "#ff7a68", "#a8232f", 5);
  c.strokeStyle = "rgba(24,14,30,.5)"; c.lineWidth = 1; c.beginPath(); for (let i = 1; i < 10; i++) { c.moveTo(x - w / 2 + w * i / 10, y + 2); c.lineTo(x - w / 2 + w * i / 10, y + h - 2); } c.stroke();
  label(c, `${Math.ceil(m.hp)} / ${m.max}`, x, y + h - 2.6, "800 9px system-ui", "#fff", 2.4);
  for (const s of [-1, 1]) { const ex = x + s * (w / 2 + 4); c.fillStyle = "#e9c46a"; c.strokeStyle = "#3b2c36"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ex, y - 6); c.lineTo(ex + s * 12, y - 12); c.lineTo(ex + s * 7, y + 2); c.lineTo(ex + s * 12, y + h + 12); c.lineTo(ex, y + h + 6); c.closePath(); c.fill(); c.stroke(); }
  c.beginPath(); c.arc(x - w / 2 - 16, y + h / 2, 9, 0, 6.3); c.fillStyle = "#32142a"; c.fill(); c.strokeStyle = "#e9c46a"; c.lineWidth = 2; c.stroke(); label(c, "★", x - w / 2 - 16, y + h / 2 + 4, "800 11px system-ui", "#ff9a8a", 1.6);
  c.restore();
}


// ---- skill effects (world space).  f = { kind, x, y, px, py, t, col, R }, k = t / 1.1
const glow = (c, col, a, w) => { c.globalAlpha = a; c.strokeStyle = `rgba(${col},1)`; c.shadowColor = `rgba(${col},.95)`; c.shadowBlur = 14; c.lineWidth = w; c.lineCap = "round"; };
function dmgPopup(c, f, k) {   // three identities: normal (red + white) · critical (black + maroon, glowing) · deadly (white glow + purple demonic aura)
  const y = f.y - k * 38 - (f.dk === "n" ? 0 : 8), pop = f.dk === "n" ? 1 : 1 + Math.max(0, 0.5 - f.t * 2.4) * (f.dk === "deadly" ? 1.4 : 1), T = f.t;
  c.save(); c.translate(f.x, y); c.scale(pop, pop); c.lineJoin = "round"; c.textAlign = "center";
  if (f.dk === "deadly") { const g = c.createRadialGradient(0, -8, 2, 0, -8, 40 + Math.sin(T * 14) * 4); g.addColorStop(0, "rgba(190,110,255,.75)"); g.addColorStop(0.55, "rgba(120,40,200,.35)"); g.addColorStop(1, "rgba(80,20,140,0)"); c.fillStyle = g; c.fillRect(-60, -60, 120, 100);
    c.fillStyle = "rgba(160,80,255,.7)"; for (let i = 0; i < 7; i++) { const a = i * 0.9 + T * 2.2, r = 20 + (i % 3) * 5; c.beginPath(); c.moveTo(Math.cos(a) * r, -8 + Math.sin(a) * r * 0.7); c.lineTo(Math.cos(a + 0.16) * (r + 12 + Math.sin(T * 12 + i) * 4), -8 + Math.sin(a + 0.16) * (r + 12) * 0.7); c.lineTo(Math.cos(a + 0.32) * r, -8 + Math.sin(a + 0.32) * r * 0.7); c.fill(); }
    c.font = "900 27px system-ui"; c.lineWidth = 4; c.strokeStyle = "#5a1ea0"; c.shadowColor = "#c46bff"; c.shadowBlur = 16; c.strokeText(f.txt, 0, 0); c.fillStyle = "#ffffff"; c.fillText(f.txt, 0, 0); }
  else if (f.dk === "crit") { c.font = "900 22px system-ui"; c.lineWidth = 4.2; c.strokeStyle = "#8a1230"; c.shadowColor = "#ff3050"; c.shadowBlur = 12; c.strokeText(f.txt + "!", 0, 0); c.shadowBlur = 0; c.fillStyle = "#12070b"; c.fillText(f.txt + "!", 0, 0); }
  else { c.font = "800 15px system-ui"; c.lineWidth = 3.4; c.strokeStyle = "#8a1a1a"; c.strokeText(f.txt, 0, 0); c.fillStyle = "#fff3ee"; c.fillText(f.txt, 0, 0); }
  c.restore();
}
const SKFX = {
  shock(c, f, k) { const cols = f.cols; cols.forEach((col, i) => { const kk = Math.max(0, Math.min(1, k * 1.6 - i * 0.06)), R = 30 + (f.R - 30) * kk; c.globalAlpha = (1 - kk) * 0.85; c.strokeStyle = col; c.lineWidth = 5 - 3 * kk; c.shadowColor = col; c.shadowBlur = 10; c.beginPath(); c.ellipse(f.x, f.y, R, R * 0.38, 0, 0, 6.3); c.stroke(); }); },
  vslash(c, f, k) { const q = Math.min(1, f.t / 0.28), a = 1 - Math.max(0, (f.t - 0.28) / 0.5); if (a <= 0) return; glow(c, f.col, a, 7 * (1 - f.t * 0.8)); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(f.x + s * 46, f.y - 120); c.lineTo(f.x + s * 46 * (1 - q), f.y - 120 + 96 * q); c.stroke(); } },
  crescent(c, f, k) { const q = Math.min(1, f.t / 0.35), a = 1 - Math.max(0, (f.t - 0.3) / 0.6); if (a <= 0) return; const R = (f.R || 118) * (0.7 + 0.3 * q); glow(c, f.col, a, 9 * (1 - q * 0.5)); c.beginPath(); c.ellipse(f.x, f.y - 30, R, R * 0.5, 0, -2.6, -2.6 + 5.2 * q); c.stroke(); },
  dash(c, f, k) { const a = 1 - Math.min(1, f.t / 0.5); if (a <= 0) return; glow(c, f.col, a, 10 * a); c.beginPath(); c.moveTo(f.px ?? f.x - 80, (f.py ?? f.y) - 60); c.lineTo(f.x, f.y - 60); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo((f.px ?? f.x - 80) - 10, (f.py ?? f.y) - 74); c.lineTo(f.x + 14, f.y - 52); c.stroke(); },
  thunder(c, f, k) { const a = 1 - Math.min(1, f.t / 0.7); if (a <= 0) return; glow(c, f.col, a, 4); for (let i = 0; i < 5; i++) { const ang = i * 1.256 + 0.4, r = (f.R || 130) * 0.8; let x = f.x + Math.cos(ang) * r, y = f.y - 190; c.beginPath(); c.moveTo(x, y); for (let j = 1; j <= 5; j++) { x += Math.sin(f.t * 40 + i * 7 + j * 3) * 14 + (f.x + Math.cos(ang) * r * 0.9 - x) * 0.2; y += (f.y + Math.sin(ang) * r * 0.35 - 10 - y) / (6 - j + 1); c.lineTo(x, y); } c.stroke(); } const R = (f.R || 130) * Math.min(1, f.t / 0.4); c.lineWidth = 5; c.beginPath(); c.ellipse(f.x, f.y - 4, R, R * 0.36, 0, 0, 6.3); c.stroke(); },
  flurry(c, f, k) { const a = 1 - Math.min(1, f.t / 0.8); if (a <= 0) return; for (let i = 0; i < 6; i++) { const q = Math.min(1, Math.max(0, (f.t - i * 0.07) / 0.14)); if (q <= 0) continue; const ang = i * 1.9, r = 34 + (i % 3) * 8; glow(c, f.col, a, 5); c.beginPath(); c.moveTo(f.x - Math.cos(ang) * r, f.y - 70 - Math.sin(ang) * r * 0.8); c.lineTo(f.x - Math.cos(ang) * r + Math.cos(ang) * 2 * r * q, f.y - 70 - Math.sin(ang) * r * 0.8 + Math.sin(ang) * 2 * r * 0.8 * q); c.stroke(); } },
  aura(c, f, k) { const q = Math.min(1, f.t / 0.55), a = 1 - Math.max(0, (f.t - 0.25) / 0.85); if (a <= 0) return; const R = (f.R || 170) * q; glow(c, f.col, a, 10 * (1 - q * 0.6)); c.beginPath(); c.ellipse(f.x, f.y - 6, R, R * 0.4, 0, 0, 6.3); c.stroke(); c.lineWidth = 4; for (let i = 0; i < 10; i++) { const ang = i * 0.628; c.beginPath(); c.moveTo(f.x + Math.cos(ang) * R * 0.55, f.y - 6 + Math.sin(ang) * R * 0.22); c.lineTo(f.x + Math.cos(ang) * R, f.y - 6 + Math.sin(ang) * R * 0.4); c.stroke(); } },
  rain(c, f, k) { const a = 1 - Math.max(0, (f.t - 0.6) / 0.5); if (a <= 0) return; glow(c, f.col, a, 4); for (let i = 0; i < 16; i++) { const q = Math.min(1, Math.max(0, (f.t - (i % 8) * 0.05) / 0.3)); if (q <= 0 || q >= 1) continue; const ang = i * 2.4, r = (f.R || 200) * (0.25 + 0.75 * ((i * 37) % 10) / 10), x = f.x + Math.cos(ang) * r, y = f.y + Math.sin(ang) * r * 0.4, yy = y - 220 * (1 - q); c.beginPath(); c.moveTo(x, yy - 46); c.lineTo(x, yy); c.stroke(); } },
  heal(c, f, k) { const a = 1 - Math.min(1, f.t / 1.0); if (a <= 0) return; glow(c, f.col, a, 5); const R = 24 + 36 * Math.min(1, f.t / 0.5); c.beginPath(); c.ellipse(f.x, f.y - 4, R, R * 0.36, 0, 0, 6.3); c.stroke(); c.fillStyle = `rgba(${f.col},1)`; for (let i = 0; i < 6; i++) { const yy = f.y - 20 - ((f.t * 90 + i * 40) % 170), xx = f.x + Math.sin(i * 2 + f.t * 3) * 34; c.globalAlpha = a * 0.9; c.fillRect(xx - 1.5, yy - 5, 3, 10); c.fillRect(xx - 5, yy - 1.5, 10, 3); } },
  guard(c, f, k) { const a = 1 - Math.min(1, f.t / 1.0); if (a <= 0) return; glow(c, f.col, a, 5); for (let j = 0; j < 2; j++) { const R = 34 + j * 14 + 12 * Math.min(1, f.t / 0.4); c.beginPath(); for (let i = 0; i <= 6; i++) { const ang = i * 1.047 + 0.5; c.lineTo(f.x + Math.cos(ang) * R, f.y - 60 + Math.sin(ang) * R * 1.3); } c.stroke(); } },
  rage(c, f, k) { const a = 1 - Math.min(1, f.t / 1.0); if (a <= 0) return; glow(c, f.col, a, 5); for (let i = 0; i < 9; i++) { const xx = f.x + (i - 4) * 9, h0 = 30 + ((i * 13) % 5) * 12 + f.t * 60; c.beginPath(); c.moveTo(xx, f.y - 6); c.quadraticCurveTo(xx + Math.sin(f.t * 12 + i) * 8, f.y - h0 * 0.6, xx, f.y - h0 - 20); c.stroke(); } },
};

const REACH = 54, MOB_SWING = 1.7;
export class Grinder {
  constructor(engine) {
    this.e = engine; this.on = false; this.mobs = []; this.fx = []; this.status = "off"; this.target = null; this.atkT = 0; this.repathT = 0; this.respawn = []; this.dying = []; this.rigs = new Map();
    this.retreats = 0; this.session = { kills: 0, exp: 0, xc: 0 }; this.listeners = new Set(); this.lootWarn = 0; this.restLabel = "";
    this.cd = {}; this.cdMax = {}; this.buffs = []; this.chant = null; this._st = null; this._stT = -1;
  }
  get eco() { return this.e.eco; }
  get hero() { return getHero(this.eco); }
  /** final attributes incl. temporary skill buffs (recomputed at most once per frame) */
  get st() { if (!this._st || this._stT !== this.e.time) { const b = { atk: 0, def: 0 }; for (const x of this.buffs) { b.atk += x.atk || 0; b.def += x.def || 0; } this._st = statsOf(this.eco, b); this._stT = this.e.time; } return this._st; }
  get species() { return speciesById(this.hero.species); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const f of this.listeners) f(); }
  setSpecies(id) { const h = this.hero; if (h.species === id) return; h.species = id; this.retreats = 0; if (this.on) { if (this.e.areaId !== this.species.z) { this.setOn(false); this.toggle(); } else { this.clearMobs(); this._fill(true); } } this._emit(); }
  toggle() {
    if (this.e.meditating) { this.e.ui.toast?.("You are absorbing an Origin."); return; }
    if (this.on) return this.setOn(false, "manual"); const sp = this.species, e = this.e;
    if (e.busy) return; if (e.areaId !== sp.z) { e.ui.toast?.(`Travelling to ${AREA_NAMES[sp.z] || sp.z}…`); e.travel(sp.z, "s", { then: () => this.setOn(true) }); return; }
    this.setOn(true);
  }
  setOn(on, why) {
    if (on === this.on) return; this.on = on; this.target = null; this.retreats = 0; this.e.cancelAction(); this.e.player.path = [];
    if (on) { this.session = { kills: 0, exp: 0, xc: 0 }; this.status = "seek"; this._fill(true); this.e.ui.toast?.(`Auto-grind on · ${this.species.name}`); }
    else { this.status = "off"; this.clearMobs(); if (why === "manual") this.e.ui.toast?.("Auto-grind stopped."); }
    this._emit();
  }
  clearMobs() { for (const m of this.mobs) this.fx.push({ x: m.x, y: m.y - 20, t: 0, txt: "✦", col: "#fff4cf", puff: true }); this.mobs = []; this.dying = []; this.respawn = []; this.target = null; }

  // ---------------------------------------------------------------- spawning
  _rig(sp) { const k = sp.id; if (!this.rigs.has(k)) this.rigs.set(k, buildRig(sp.kind, sp.tint, TIER_SIZE[sp.tier], sp.tier)); return this.rigs.get(k); }
  _spot() {
    const e = this.e, w = e.world, T = w.tile, p = e.player, zoned = !w.home, en = w.entries?.s;
    for (let i = 0; i < 80; i++) {
      const c = zoned ? 3 + Math.floor(Math.random() * (w.cols - 6)) : 2 + Math.floor(Math.random() * (w.cols - 4)), r = zoned ? 7 + Math.floor(Math.random() * (w.rows - 13)) : 16 + Math.floor(Math.random() * (w.rows - 17)); if (!e.walkable(c, r)) continue;
      const t = w.terrainAt(c, r); if (t === 4 || t === 5 || t === 7 || (!zoned && (t === 3 || t === 9)) || (zoned && t === 10)) continue; const x = (c + 0.5) * T, y = (r + 0.5) * T;
      if (w.home && Math.hypot(x - w.home.x, y - w.home.y) < 260) continue; if (zoned && en && Math.hypot(x - (en.c + 0.5) * T, y - (en.r + 0.5) * T) < 240) continue;
      if (Math.hypot(x - p.x, y - p.y) < 130) continue; if (this.mobs.some((m) => Math.hypot(m.x - x, m.y - y) < 90)) continue;
      if (e._facBlocked?.[r * w.cols + c]) continue; return { x, y };
    }
    return null;
  }
  _spawn(sp) {
    const s = this._spot(); if (!s) return false; const lv = rollLevel(sp), hp = mobHp(lv, sp.tier);
    this.mobs.push({ sp, lv, hp, max: hp, x: s.x, y: s.y, hx: s.x, hy: s.y, ph: Math.random() * 6.3, t: Math.random() * 20, id: Math.random() * 10, lag: hp, mv: 0, swingAt: -9, hitAt: -9, flash: 0, dead: 0, wanderT: Math.random() * 3, vx: 0, vy: 0, face: Math.random() < 0.5 ? 1 : -1, born: 0, atkT: 0.8 }); return true;
  }
  _fill(first) { const sp = this.species, n = this.mobs.filter((m) => m.sp.id === sp.id).length; for (let i = n; i < TIER_COUNT[sp.tier]; i++) { if (!this._spawn(sp)) break; } if (first) this.respawn = []; }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < 1.1);
    const T = this.e.time, p = this.e.player, h = this.hero, st = this.st;
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt); this.recover = Math.max(0, (this.recover || 0) - dt); h.qi = Math.min(st.qiCap, (h.qi ?? st.qiCap) + st.qiRegen * dt);   // Qi regenerates all the time; recovery = the pause after a skill this.buffs = this.buffs.filter((b) => b.until > T);
    if (st.regen > 0) h.hp = Math.min(st.maxHp, h.hp + st.maxHp * st.regen / 100 * dt); for (const b of this.buffs) if (b.regen) h.hp = Math.min(st.maxHp, h.hp + st.maxHp * b.regen / 100 * dt);
    p.lunge = Math.max(0, (p.lunge || 0) - dt * 5);
    if (!this.on) { if (h.hp < st.maxHp) { h.hp = Math.min(st.maxHp, h.hp + st.maxHp * 0.012 * dt); } return; }
    // respawn queue
    for (const r of this.respawn) r.t -= dt; const due = this.respawn.filter((r) => r.t <= 0); if (due.length) { this.respawn = this.respawn.filter((r) => r.t > 0); for (const r of due) this._spawn(r.sp); }
    // mob idle wander
    for (const m of this.mobs) {
      if (m.prov > 0) m.prov -= dt;
      if (m.fear > 0) { m.fear -= dt; const ax = m.x - p.x, ay = m.y - p.y, L = Math.hypot(ax, ay) || 1, T0 = this.e.world.tile, nx = m.x + ax / L * 56 * dt, ny = m.y + ay / L * 40 * dt; if (Math.hypot(nx - m.hx, ny - m.hy) < 320 && this.e.walkable(Math.floor(nx / T0), Math.floor(ny / T0))) { m.x = nx; m.y = ny; } m.face = ax > 0 ? 1 : -1; m.mv += (1 - m.mv) * Math.min(1, dt * 6); m.t += dt; m.born = Math.min(1, m.born + dt * 2.2); m.lag = Math.max(m.hp, m.lag - m.max * 0.7 * dt); m.flash = Math.max(0, m.flash - dt * 4); continue; }
      m.t += dt; m.flash = Math.max(0, m.flash - dt * 4); m.born = Math.min(1, m.born + dt * 2.2); m.lag = Math.max(m.hp, m.lag - m.max * 0.7 * dt);
      if (m === this.target && this.status === "fight") { m.mv += (0 - m.mv) * Math.min(1, dt * 8); continue; }
      m.wanderT -= dt; if (m.wanderT <= 0) { m.wanderT = 1.5 + Math.random() * 2.5; const a = Math.random() * 6.3, d = Math.random() < 0.45 ? 0 : 14 + Math.random() * 20; m.vx = Math.cos(a) * d; m.vy = Math.sin(a) * d * 0.7; }
      const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt, T = this.e.world.tile; if (Math.hypot(nx - m.hx, ny - m.hy) < 110 && this.e.walkable(Math.floor(nx / T), Math.floor(ny / T))) { m.x = nx; m.y = ny; if (Math.abs(m.vx) > 2) m.face = m.vx > 0 ? 1 : -1; } else { m.vx = -m.vx; m.vy = -m.vy; }
      m.mv += ((Math.hypot(m.vx, m.vy) > 2 ? 1 : 0) - m.mv) * Math.min(1, dt * 6);
    }
    this.dying = this.dying.filter((d) => this.e.time - d.t0 < 1.0);
    // resting
    if (this.status === "rest") {
      p.moving = false; p.path = []; h.hp = Math.min(st.maxHp, h.hp + st.maxHp * 0.05 * dt);
      if (h.hp >= st.maxHp * 0.8) { this.status = "seek"; this._emit(); } return;
    }
    if (h.hp < st.maxHp * 0.3) { this._retreat("low"); return; }
    // pick a target
    if (this.target?.fear > 0 && this.mobs.some((x) => x !== this.target && x.sp.id === this.species.id && !(x.fear > 0))) this.target = null;   // don't chase a cowed monster while others are still standing
    if (!this.target || !this.mobs.includes(this.target)) {
      this.target = null; let best = null, bd = 1e9; for (const m of this.mobs) { if (m.sp.id !== this.species.id) continue; const d = Math.hypot(m.x - p.x, m.y - p.y) + (m.fear > 0 ? 400 : 0); if (d < bd) { bd = d; best = m; } }
      if (!best) { this._fill(false); this.status = "seek"; p.moving = false; return; } this.target = best; this.status = "seek"; this.repathT = 0;
    }
    const m = this.target, dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
    if (d > REACH) {
      this.status = "seek"; this.repathT -= dt; if (this.repathT <= 0 || !p.path.length) { this.repathT = 0.6; const T = this.e.world.tile; const path = this.e.findPath(p.x, p.y, Math.floor(m.x / T), Math.floor(m.y / T)); if (path) p.path = path.filter((n, i) => i < path.length - 1 || Math.hypot(n.x - m.x, n.y - m.y) > REACH * 0.6); else { m.hx = m.x = p.x + 200 * (Math.random() - 0.5); this.target = null; } }
      return;
    }
    // in reach: fight
    p.path = []; p.moving = false; this.status = "fight"; p.dir = this.e.dirFrom(dx, dy); this.atkT -= dt; m.atkT -= dt; m.face = dx < 0 ? 1 : -1;
    if (cult(this.eco).autoAura !== false && this.pressureReady()) this.pressure(false);
    if (this.chant) { this.chant.t += dt; if (this.chant.t >= this.chant.dur) { const id = this.chant.id; this.chant = null; this._fire(id); if (m.hp <= 0 || !this.mobs.includes(m)) return; } }
    else if (skillRec(this.eco).auto && !(this.recover > 0) && this._autoCast(m, st)) { if (m.hp <= 0 || !this.mobs.includes(m)) return; }
    if (this.atkT <= 0 && !this.chant && !(this.recover > 0)) { this.atkT = st.speed; const r = heroHit(st, m.sp.tier); if (this._hit(m, 1, r.dmg, r.crit)) return; }
    if (m.fear > 0) m.atkT = Math.max(m.atkT, 0.4);   // a cowed monster does not strike back
    else if (m.atkT <= 0) {
      m.atkT = MOB_SWING * (m.prov > 0 ? 0.8 : 1); m.swingAt = this.e.time;
      if (Math.random() * 100 < st.evade) this.fx.push({ x: p.x, y: p.y - 130, t: 0, txt: "Miss", col: "#bfe3d0" });
      else { const dmg = Math.round(mobHit(m.sp, m.lv, st.def) * (m.prov > 0 ? 1.35 : 1)); h.hp -= dmg; this.e.kick?.(Math.min(6, 2 + 8 * dmg / st.maxHp)); this.fx.push({ x: p.x, y: p.y - 130, t: 0, txt: "-" + dmg, col: "#ff9a8a" }); if (h.hp <= 0) return this._faint(); }
    }
  }
  /** one blow on mob m; returns true when it killed it */
  _hit(m, k, base, crit, deadly) {
    const p = this.e.player, dmg = Math.max(1, Math.round(base * k * (m.fear > 0 ? 1.15 : 1))); m.hp -= dmg; m.flash = 1; m.hitAt = this.e.time; p.lunge = 1;
    this.fx.push({ x: m.x + (Math.random() - 0.5) * 16, y: m.y - sizeOf(m.sp) * 0.8, t: 0, txt: String(dmg), col: crit ? "#ffd27a" : "#fff4cf", big: !!crit, dk: deadly ? "deadly" : crit ? "crit" : "n" }); this.e.ui.audio?.thud?.(); this.e.kick?.(deadly ? 5 : crit ? 3 : Math.min(2.2, 0.9 + 3 * dmg / (this.st.maxHp + 1)) * (k > 1.6 ? 1.5 : 1));
    if (m.hp <= 0) { this._kill(m); return true; } return false;
  }
  // ---------------------------------------------------------------- skills (4 quick slots; see data/skills.js)
  // ---------------------------------------------------------------- Origin Surge: the Guanghuan's aura intimidates weaker monsters
  //   P = sum over bound slots of grade x (0.6 + quality / 100)      (one grade-1 Origin ~ 1, a full crown of high-grade Origins ~ 40)
  //   monster level below yours (gap d >= 1):  cowed with p = min(97%, 45% + 7% x d + 1.5% x P) for 4 + d/2 s (max 12 s): flees, cannot strike back, takes +15% damage
  //   same level:                              small chance to flee (6% + 0.4% x P, max 25%, 3.5 s) - or to be PROVOKED instead (12% - 0.3% x P, min 3%): +35% damage, +20% swing speed for 8 s
  //   higher level, bosses and sub bosses:     unaffected.   Cooldown 30 s - 0.4 x P (max -12 s).  Auto-fires when a fight starts (setting in the Character menu) or from the HUD button.
  originPower() { const c = this.eco.state.flags?.cult; let p = 0; for (const r of c?.slots || []) if (r) p += (r.tier + 1) * (0.6 + r.quality / 100); return p; }
  pressureReady() { return this.on && this.originPower() > 0 && !((this.cd._aura || 0) > 0) && this.mobs.some((m) => m.sp.tier === "mob"); }
  pressure(manual) {
    const e = this.e, p = e.player, P = this.originPower(), lv = this.hero.lv; if (P <= 0) { if (manual) e.ui.toast?.("Absorb an Origin to use Origin Surge."); return false; }
    if (!this.on) { if (manual) e.ui.toast?.("Origin Surge works on monsters — start Auto-grind first."); return false; } if ((this.cd._aura || 0) > 0) { if (manual) e.ui.toast?.(`Origin Surge — ${Math.ceil(this.cd._aura)}s`); return false; }
    this.cd._aura = this.cdMax._aura = 30 - Math.min(12, 0.4 * P); let cowed = 0, riled = 0;
    for (const m of this.mobs) { if (Math.hypot(m.x - p.x, m.y - p.y) > 340) continue; const say = (t, col) => this.fx.push({ x: m.x, y: m.y - sizeOf(m.sp) - 6, t: 0, txt: t, col, wide: true });
      if (m.sp.tier !== "mob") { say("Unshaken", "#c9c3d6"); continue; } const d = lv - m.lv;
      if (d >= 1) { if (Math.random() < Math.min(0.97, 0.45 + 0.07 * d + 0.015 * P)) { m.fear = Math.min(12, 4 + d / 2); cowed++; say("COWED", "#9fd8ff"); } else say("Unmoved", "#c9c3d6"); }
      else if (d === 0) { const r = Math.random(), pf = Math.min(0.25, 0.06 + 0.004 * P), pt = Math.max(0.03, 0.12 - 0.003 * P); if (r < pf) { m.fear = 3.5; cowed++; say("FLEES", "#9fd8ff"); } else if (r < pf + pt) { m.prov = 8; riled++; say("PROVOKED!", "#ff6a5a"); } }
      else say("Unfazed", "#c9c3d6"); }
    const cu = this.eco.state.flags.cult, cols = cu?.innate ? [elementOf(cu.innate).col, "#ffffff"] : []; e.originFlash = e.time; e.kick?.(2.5);
    this.fx.push({ kind: "shock", x: p.x, y: p.y, t: 0, cols: cols.length ? cols : ["#ffffff"], R: 340 }); e.ui.audio?.ok?.();
    e.ui.toast?.(cowed || riled ? `Origin Surge — ${cowed} cowed${riled ? `, ${riled} provoked!` : ""}` : "Origin Surge — nothing stirs."); this._emit(); return true;
  }
  /** Origin Devourer: an Origin Beast that fell may yield its Origin.  Forced Extraction (can fail) or Voluntary Surrender (always works).  On Auto the technique is used without interrupting the hunt. */
  async _extractOffer(offer, m) {
    const e = this.e, c = cult(this.eco), auto = this.on && c.autoExtract !== false; let take = true;
    if (!auto) { const pct = Math.round(offer.odds * 100), r = await e.ui.say?.([{ text: offer.surrender ? `The ${m.sp.name} lowers its head and offers up its Origin.` : `Something still burns inside the fallen ${m.sp.name}. Origin Devourer — Forced Extraction: ${pct}% to take it whole.`, choices: [offer.surrender ? "Accept its Origin" : `Extract it (${pct}%)`, "Leave it"] }]); take = r === 0; }
    const res = resolveExtraction(this.eco, offer, take);
    if (res.ok) { e.ui.audio?.ok?.(); e.ui.toast?.(offer.surrender ? `${m.sp.name} surrendered its Origin — see the Guanghuan menu.` : `Origin extracted from ${m.sp.name} — see the Guanghuan menu.`); }
    else if (res.why === "dissipated") { e.ui.audio?.no?.(); e.ui.toast?.(`The Origin of ${m.sp.name} dissipated before you could take it.`); }
    this._emit();
  }
  /** auto-use: heal when hurt, buffs before a fight, attacks when ready.  Returns true when something was started. */
  _autoCast(m, st) {
    const h = this.hero, r = skillRec(this.eco);
    for (const id of r.slots) { const sk = SKILL[id]; if (!sk || (this.cd[id] || 0) > 0 || !usable(this.eco, id).ok) continue;
      if (sk.type === "heal" && h.hp > st.maxHp * 0.55) continue; if (sk.type === "buff" && this.buffs.some((b) => b.id === id)) continue;
      if (this.cast(id)) return true; }
    return false;
  }
  slotSkill(i) { return SKILL[skillRec(this.eco).slots[i]] || null; }
  /** start a skill (manual tap or auto).  Returns false (with a reason in this.why) when it cannot be used right now. */
  cast(id) {
    const e = this.e, p = e.player, h = this.hero, st = this.st, sk = SKILL[id]; this.why = "";
    const u = usable(this.eco, id); if (!u.ok) { this.why = u.why; return false; } if (e.busy) { this.why = ""; return false; }
    if (this.chant) { this.why = "Already chanting."; return false; } if ((this.cd[id] || 0) > 0) { this.why = "Not ready yet."; return false; }
    if (sk.type === "heal" && h.hp >= st.maxHp) { this.why = "HP is already full."; return false; }
    if (sk.type === "hit") { const m = this.target; if (!this.on || !m || !this.mobs.includes(m) || Math.hypot(m.x - p.x, m.y - p.y) > REACH + 14) { this.why = this.on ? "Move closer to a target first." : "Start Auto-grind first."; return false; } }
    if (sk.type === "aoe" && !(this.on && this.mobs.some((o) => Math.hypot(o.x - p.x, o.y - p.y) <= sk.radius + 20))) { this.why = this.on ? "No enemy in range." : "Start Auto-grind first."; return false; }
    if ((this.recover || 0) > 0) { this.why = "Recovering…"; return false; } const cost = Math.ceil(qiCost(sk) * st.qiCostMul); if ((h.qi ?? st.qiCap) + 1e-9 < cost) { this.why = `Not enough Qi (${cost}).`; return false; } h.qi = (h.qi ?? st.qiCap) - cost;
    const dur = sk.chant * (1 - st.chantRed / 100); p.path = []; p.moving = false;
    if (dur < 0.15) this._fire(id); else { this.chant = { id, t: 0, dur }; this.fx.push({ ring: true, x: p.x, y: p.y, t: 0, col: sk.col, small: true }); }
    this._emit(); return true;
  }
  _fire(id) {
    const e = this.e, p = e.player, h = this.hero, st = this.st, sk = SKILL[id], sc = 1 + st.skillPct / 100; if (!sk) return;
    this.cd[id] = this.cdMax[id] = sk.cd * (1 - st.cdRed / 100); this.recover = 0.55 * (1 - st.recovRed / 100); this.atkT = Math.max(this.atkT, 0.35);
    if (sk.type === "heal") { const n = Math.round(st.maxHp * sk.heal); h.hp = Math.min(st.maxHp, h.hp + n); if (sk.regen) this.buffs.push({ id, regen: sk.regen, until: e.time + 10 }); this.fx.push({ x: p.x, y: p.y - 150, t: 0, txt: "+" + n, col: "#9be5a8" }, { kind: "heal", x: p.x, y: p.y, t: 0, col: sk.col }); e.ui.audio?.ok?.(); }
    else if (sk.type === "buff") { this.buffs = this.buffs.filter((b) => b.id !== id); this.buffs.push({ id, atk: sk.buff.atk, def: sk.buff.def, until: e.time + sk.buff.dur, col: sk.col }); this.fx.push({ kind: sk.fx, x: p.x, y: p.y, t: 0, col: sk.col }, { x: p.x, y: p.y - 150, t: 0, txt: sk.name, col: "#f2d889", wide: true }); e.ui.audio?.ok?.(); }
    else if (sk.type === "hit") {
      const m = this.target; if (!m || !this.mobs.includes(m)) return; this.fx.push({ kind: sk.fx, x: m.x, y: m.y, px: p.x, py: p.y, t: 0, col: sk.col });
      for (let i = 0; i < sk.hits && this.mobs.includes(m); i++) { const r = heroHit(st, m.sp.tier); this._hit(m, sk.mult * sc, r.dmg, r.crit || i === sk.hits - 1, r.deadly); }
    } else if (sk.type === "aoe") {
      this.fx.push({ kind: sk.fx, x: p.x, y: p.y, t: 0, col: sk.col, R: sk.radius });
      for (const o of [...this.mobs]) { if (Math.hypot(o.x - p.x, o.y - p.y) > sk.radius + 20) continue; const r = heroHit(st, o.sp.tier); this._hit(o, sk.mult * sc, r.dmg, r.crit, r.deadly); }
    }
    e.ui.audio?.thud?.(); this._emit();
  }
  _retreat(why) {
    const m = this.target; if (m) { m.hp = m.max; } this.target = null; this.retreats++; this.e.player.path = [];
    if (this.retreats >= 4 && why === "low") { this.setOn(false); this.e.ui.toast?.("Auto-grind stopped — that target is too tough. Try a lower-level one."); return; }
    this.status = "rest"; this.fx.push({ x: this.e.player.x, y: this.e.player.y - 140, t: 0, txt: "Resting…", col: "#bfe3d0" }); this._emit();
  }
  _faint() {
    const e = this.e, h = this.hero; this.setOn(false); this.chant = null; h.hp = Math.round(this.st.maxHp * 0.6); e.ui.toast?.("You fainted and were carried home. Auto-grind stopped.");
    e.travel("home", "s", { spot: "homeDoor", force: true });
  }
  _kill(m) {
    const e = this.e, h = this.hero, st = this.st, rw = rewards(m.sp, m.lv, h.lv, e.catalog, Math.random, 1 + st.dropPct / 100), parts = []; rw.exp = Math.round(rw.exp * (1 + st.expPct / 100)); parts.push(`+${rw.exp} exp`);
    this.mobs = this.mobs.filter((x) => x !== m); this.dying.push({ m, t0: this.e.time }); this.target = null; this.retreats = 0; h.kills = (h.kills || 0) + 1; (h.dex ||= {})[m.sp.id] = (h.dex[m.sp.id] || 0) + 1; this.session.kills++; this.session.exp += rw.exp;
    this.fx.push({ x: m.x, y: m.y - 20, t: 0, txt: "✦", col: "#fff4cf", puff: true });
    if (rw.xc > 0) { this.eco.state.wallet_xc = Math.round((this.eco.state.wallet_xc + rw.xc) * 100) / 100; this.session.xc += rw.xc; this.eco.ledger?.("hunt", rw.xc, m.sp.name); parts.push(`+${rw.xc} xc`); e.ui.audio?.coin?.(); }
    let lost = false; for (const it of rw.items) { const r = this.eco.addItem(it.item_id, it.quantity); if (r.ok) parts.push(`+${it.quantity} ${e.catalog.itemName(it.item_id)}`); else lost = true; }
    if (lost && performance.now() - this.lootWarn > 8000) { this.lootWarn = performance.now(); e.ui.toast?.("Your bag is full — some loot was left behind."); }
    for (const b of rollBooks(m.sp, st.dropPct)) { addBooks(this.eco, b.id, b.n); parts.push(ownsClass(this.eco, SKILL[b.id].cls) || SKILL[b.id].cls === "basic" ? `+${b.n} ${SKILL[b.id].name} book` : `+${b.n} skill book`); e.ui.audio?.ok?.(); }
    const offer = offerExtraction(this.eco, m.sp, ART, st.dropPct, m.lv); if (offer) this._extractOffer(offer, m);
    const wasGate = gateOf(this.eco), up = addExp(this.eco, rw.exp); if (wasGate && !this.eco.state.flags.cult.toldGate?.[wasGate]) { (this.eco.state.flags.cult.toldGate ||= {})[wasGate] = 1; e.ui.toast?.(wasGate === "awaken" ? "Your EXP is full — visit the Awakening Facility in the Village to awaken your Origin." : wasGate === "slot1" ? "Guanghuan Slot 1 is open — defeat an Origin Beast and take its Origin with Origin Devourer, then absorb it to open Guanghuan Initiate (Lv 2)." : "Realm cap reached — EXP is banked. The next Guanghuan slot is open: defeat an Origin Beast, take its Origin with Origin Devourer, then absorb it."); } this.fx.push({ x: e.player.x, y: e.player.y - 150, t: 0, txt: parts.join("  "), col: "#f2d889", wide: true });
    if (up) { e.ui.toast?.(`Level up! Lv ${h.lv} · +${up * 3} stat points` + (pointsOf(this.eco).free >= NODE_COST ? " — open the Node System" : "")); e.ui.audio?.ok?.(); this.fx.push({ x: e.player.x, y: e.player.y - 170, t: 0, txt: "LEVEL UP  +" + up * 3 + " pts", col: "#9be5a8", wide: true }); const fl = this.eco.state.flags; if (!fl.toldPoints && pointsOf(this.eco).free >= NODE_COST) { fl.toldPoints = true; e.ui.say?.([{ who: "player", text: "My meridians are stirring… I should spend these stat points." }, "Open the Node System (the node button, right side) and activate a node next to the glowing centre. Each node costs 6 points; levelling never raises a stat by itself."]); } }
    this.respawn.push({ sp: m.sp, t: TIER_RESPAWN[m.sp.tier] * (0.7 + Math.random() * 0.6) }); this.eco.changed?.(); this._emit();
  }

  // ---------------------------------------------------------------- drawing
  entities(c) {
    const out = [], e = this.e, T = e.time, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const one = (m, d) => ({ y: m.y, f: () => {
      const spr = monsterSprite(m.sp), sz = spr ? sizeOf(m.sp) : TIER_SIZE[m.sp.tier], atk = (T - m.swingAt) / 0.55, hit = clamp(1 - (T - m.hitAt) / 0.35, 0, 1);
      if (!d && m.sp.tier === "boss") { c.save(); c.globalAlpha = 0.28 + Math.sin(T * 3) * 0.08; c.strokeStyle = "#ff6a5a"; c.lineWidth = 5; c.beginPath(); c.ellipse(m.x, m.y - 4, sz * 0.62, sz * 0.18, 0, 0, 6.3); c.stroke(); c.restore(); }
      else if (!d && m.sp.tier === "sub") { c.save(); c.globalAlpha = 0.32 + Math.sin(T * 2.4) * 0.08; c.strokeStyle = "#f2d889"; c.lineWidth = 3.5; c.beginPath(); c.ellipse(m.x, m.y - 3, sz * 0.5, sz * 0.14, 0, 0, 6.3); c.stroke(); c.restore(); }
      const st = { x: m.x, y: m.y, face: m.face, t: m.t, id: m.id, mv: m.mv, swing: atk >= 0 && atk <= 1 ? atk : -1, hit, flash: m.flash, born: m.born, dead: d ? clamp((T - d.t0) / 0.8, 0, 1) : 0, art: m.sp.art };
      if (spr) drawMonster(c, spr, { ...st, h: sz }); else drawMob(c, this._rig(m.sp), { ...st, sz });
    } });
    for (const d of this.dying) out.push(one(d.m, d)); for (const m of this.mobs) out.push(one(m, null));
    return out;
  }
  /** per-monster HP bars, drawn above everything: small for ordinary mobs, wider gold-framed for sub bosses, large ornate for bosses */
  drawBars(c) {
    const T = this.e.time;
    for (const m of this.mobs) {
      if (m.born < 0.6) continue; const spr = monsterSprite(m.sp), tier = m.sp.tier, isT = m === this.target; let top;
      if (spr) top = topOf({ y: m.y, art: m.sp.art }, sizeOf(m.sp)) + 6; else { const rig = this._rig(m.sp), sz = TIER_SIZE[tier]; top = m.y - sz + 4 + rig.top * sz - (rig.kind === "spirit" ? 10 : 0); }
      if (tier === "mob") barMob(c, m.x, top - 9, m, isT); else if (tier === "sub") barSub(c, m.x, top - 11, m); else barBoss(c, m.x, top - 13, m, T);
    }
  }
  _flashSprite() { return null; }
  drawFx(c) {
    c.save(); c.textAlign = "center"; c.lineJoin = "round";
    for (const f of this.fx) { const k = f.t / 1.1; c.globalAlpha = 1 - k * k; if (f.kind) { c.save(); SKFX[f.kind]?.(c, f, k); c.restore(); continue; }
      if (f.ring) { const kk = Math.min(1, f.t / 0.6), R = (f.small ? 36 : f.big ? 96 : 60) * (0.35 + 0.65 * kk); c.globalAlpha = 0.9 * (1 - kk); c.lineWidth = 4 + 3 * (1 - kk); c.strokeStyle = `rgba(${f.col},1)`; c.shadowColor = `rgba(${f.col},.9)`; c.shadowBlur = 12; c.beginPath(); c.ellipse(f.x, f.y - 4, R, R * 0.36, 0, 0, 6.3); c.stroke(); c.shadowBlur = 0; continue; }
      if (f.dk) { dmgPopup(c, f, k); continue; }
      if (f.puff) { c.fillStyle = f.col; c.font = "700 22px system-ui"; c.fillText("✦", f.x - 14 - k * 18, f.y - k * 30); c.fillText("✦", f.x + 14 + k * 18, f.y - k * 24); continue; }
      c.font = (f.wide ? "700 12px system-ui" : f.big ? "900 20px system-ui" : "800 15px system-ui"); c.lineWidth = 3.5; c.strokeStyle = "rgba(30,20,36,.9)"; c.strokeText(f.txt, f.x, f.y - k * 38); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y - k * 38); }
    c.restore();
    const p = this.e.player, T = this.e.time;
    if (this.chant) { const q = Math.min(1, this.chant.t / this.chant.dur), sk = SKILL[this.chant.id]; c.save(); c.lineCap = "round"; c.lineWidth = 5; c.strokeStyle = "rgba(30,20,36,.6)"; c.beginPath(); c.arc(p.x, p.y - 62, 40, 0, 6.2832); c.stroke(); c.strokeStyle = `rgba(${sk.col},1)`; c.shadowColor = `rgba(${sk.col},.9)`; c.shadowBlur = 10; c.beginPath(); c.arc(p.x, p.y - 62, 40, -1.5708, -1.5708 + 6.2832 * q); c.stroke(); c.shadowBlur = 0; c.textAlign = "center"; label(c, sk.name, p.x, p.y - 112, "800 11px system-ui", "#f9e4a6"); c.restore(); }
    for (const b of this.buffs) if (b.col) { c.save(); c.globalAlpha = 0.35 + Math.sin(T * 5) * 0.12; c.strokeStyle = `rgba(${b.col},1)`; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x, p.y - 3, 30, 10, 0, 0, 6.3); c.stroke(); c.restore(); break; }
  }
}
