// Auto-Grind: the hero hunts the chosen mob species on its own (seek -> fight -> loot -> next), rests when hurt and stops when it keeps losing.
// Pure game logic + small canvas drawing; economy rules (items, wallet) go through GameEconomy, numbers live in data/mobs.js.
import { speciesById, rollLevel, mobHp, rewards, heroHit, mobHit, heroStats, getHero, addExp, sizeOf, TIER_SIZE, TIER_RESPAWN, TIER_COUNT, MAX_LEVEL } from "./data/mobs.js";
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

const REACH = 54, MOB_SWING = 1.7;
export class Grinder {
  constructor(engine) {
    this.e = engine; this.on = false; this.mobs = []; this.fx = []; this.status = "off"; this.target = null; this.atkT = 0; this.repathT = 0; this.respawn = []; this.dying = []; this.rigs = new Map();
    this.retreats = 0; this.session = { kills: 0, exp: 0, xc: 0 }; this.listeners = new Set(); this.lootWarn = 0; this.restLabel = "";
    this.CD = { strike: 7, mend: 18 }; this.cd = { strike: 0, mend: 0 };
  }
  get eco() { return this.e.eco; }
  get hero() { return getHero(this.eco); }
  get species() { return speciesById(this.hero.species); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const f of this.listeners) f(); }
  setSpecies(id) { const h = this.hero; if (h.species === id) return; h.species = id; this.retreats = 0; if (this.on) { if (this.e.areaId !== this.species.z) { this.setOn(false); this.toggle(); } else { this.clearMobs(); this._fill(true); } } this._emit(); }
  toggle() {
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
    const p = this.e.player, h = this.hero, st = heroStats(h.lv);
    for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
    p.lunge = Math.max(0, (p.lunge || 0) - dt * 5);
    if (!this.on) { if (h.hp < st.maxHp) { h.hp = Math.min(st.maxHp, h.hp + st.maxHp * 0.012 * dt); } return; }
    // respawn queue
    for (const r of this.respawn) r.t -= dt; const due = this.respawn.filter((r) => r.t <= 0); if (due.length) { this.respawn = this.respawn.filter((r) => r.t > 0); for (const r of due) this._spawn(r.sp); }
    // mob idle wander
    for (const m of this.mobs) {
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
    if (!this.target || !this.mobs.includes(this.target)) {
      this.target = null; let best = null, bd = 1e9; for (const m of this.mobs) { if (m.sp.id !== this.species.id) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
      if (!best) { this._fill(false); this.status = "seek"; p.moving = false; return; } this.target = best; this.status = "seek"; this.repathT = 0;
    }
    const m = this.target, dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
    if (d > REACH) {
      this.status = "seek"; this.repathT -= dt; if (this.repathT <= 0 || !p.path.length) { this.repathT = 0.6; const T = this.e.world.tile; const path = this.e.findPath(p.x, p.y, Math.floor(m.x / T), Math.floor(m.y / T)); if (path) p.path = path.filter((n, i) => i < path.length - 1 || Math.hypot(n.x - m.x, n.y - m.y) > REACH * 0.6); else { m.hx = m.x = p.x + 200 * (Math.random() - 0.5); this.target = null; } }
      return;
    }
    // in reach: fight
    p.path = []; p.moving = false; this.status = "fight"; p.dir = this.e.dirFrom(dx, dy); this.atkT -= dt; m.atkT -= dt; m.face = dx < 0 ? 1 : -1;
    if (this.cd.strike <= 0) { this.cast("strike"); if (m.hp <= 0 || !this.mobs.includes(m)) return; }
    else if (h.hp < st.maxHp * 0.5 && this.cd.mend <= 0) this.cast("mend");
    if (this.atkT <= 0) { this.atkT = st.speed; if (this._hit(m, 1, heroHit(h.lv, m.sp.tier))) return; }
    if (m.atkT <= 0) { m.atkT = MOB_SWING; m.swingAt = this.e.time; const dmg = mobHit(m.sp, m.lv, h.lv); h.hp -= dmg; this.fx.push({ x: p.x, y: p.y - 130, t: 0, txt: "-" + dmg, col: "#ff9a8a" }); if (h.hp <= 0) return this._faint(); }
  }
  /** one blow on mob m; returns true when it killed it */
  _hit(m, k, base, crit) {
    const p = this.e.player, dmg = Math.max(1, Math.round(base * k)); m.hp -= dmg; m.flash = 1; m.hitAt = this.e.time; p.lunge = 1;
    this.fx.push({ x: m.x + (Math.random() - 0.5) * 16, y: m.y - sizeOf(m.sp) * 0.8, t: 0, txt: String(dmg), col: crit ? "#ffd27a" : "#fff4cf", big: !!crit }); this.e.ui.audio?.thud?.();
    if (m.hp <= 0) { this._kill(m); return true; } return false;
  }
  /** hero skills: "strike" = Power Strike (golden ring, area damage), "mend" = heal. Used automatically while Auto is on, or by the skill buttons. */
  cast(id) {
    const e = this.e, p = e.player, h = this.hero, st = heroStats(h.lv); if (this.cd[id] > 0 || e.busy) return false;
    if (id === "mend") { if (h.hp >= st.maxHp) return false; const n = Math.round(st.maxHp * 0.35); h.hp = Math.min(st.maxHp, h.hp + n); this.cd.mend = this.CD.mend; this.fx.push({ x: p.x, y: p.y - 150, t: 0, txt: "+" + n, col: "#9be5a8" }); this.fx.push({ ring: true, x: p.x, y: p.y, t: 0, col: "155,229,168" }); e.ui.audio?.ok?.(); this._emit(); return true; }
    if (id === "strike") {
      const m = this.target; if (!this.on || !m || !this.mobs.includes(m) || Math.hypot(m.x - p.x, m.y - p.y) > REACH + 14) return false;
      this.cd.strike = this.CD.strike; this.fx.push({ ring: true, x: m.x, y: m.y, t: 0, col: "246,214,120", big: true }); this.atkT = Math.max(this.atkT, 0.4);
      const base = heroHit(h.lv, m.sp.tier); for (const o of [...this.mobs]) { if (o === m || Math.hypot(o.x - m.x, o.y - m.y) > 96) continue; this._hit(o, 0.6, base); }
      this._hit(m, 2.6, base, true); this._emit(); return true;
    }
    return false;
  }
  _retreat(why) {
    const m = this.target; if (m) { m.hp = m.max; } this.target = null; this.retreats++; this.e.player.path = [];
    if (this.retreats >= 4 && why === "low") { this.setOn(false); this.e.ui.toast?.("Auto-grind stopped — that target is too tough. Try a lower-level one."); return; }
    this.status = "rest"; this.fx.push({ x: this.e.player.x, y: this.e.player.y - 140, t: 0, txt: "Resting…", col: "#bfe3d0" }); this._emit();
  }
  _faint() {
    const e = this.e, h = this.hero; this.setOn(false); h.hp = Math.round(heroStats(h.lv).maxHp * 0.6); e.ui.toast?.("You fainted and were carried home. Auto-grind stopped.");
    e.travel("home", "s", { spot: "homeDoor", force: true });
  }
  _kill(m) {
    const e = this.e, h = this.hero, rw = rewards(m.sp, m.lv, h.lv, e.catalog), parts = [`+${rw.exp} exp`];
    this.mobs = this.mobs.filter((x) => x !== m); this.dying.push({ m, t0: this.e.time }); this.target = null; this.retreats = 0; h.kills = (h.kills || 0) + 1; this.session.kills++; this.session.exp += rw.exp;
    this.fx.push({ x: m.x, y: m.y - 20, t: 0, txt: "✦", col: "#fff4cf", puff: true });
    if (rw.xc > 0) { this.eco.state.wallet_xc = Math.round((this.eco.state.wallet_xc + rw.xc) * 100) / 100; this.session.xc += rw.xc; this.eco.ledger?.("hunt", rw.xc, m.sp.name); parts.push(`+${rw.xc} xc`); e.ui.audio?.coin?.(); }
    let lost = false; for (const it of rw.items) { const r = this.eco.addItem(it.item_id, it.quantity); if (r.ok) parts.push(`+${it.quantity} ${e.catalog.itemName(it.item_id)}`); else lost = true; }
    if (lost && performance.now() - this.lootWarn > 8000) { this.lootWarn = performance.now(); e.ui.toast?.("Your bag is full — some loot was left behind."); }
    const up = addExp(this.eco, rw.exp); this.fx.push({ x: e.player.x, y: e.player.y - 150, t: 0, txt: parts.join("  "), col: "#f2d889", wide: true });
    if (up) { e.ui.toast?.(`Level up! Lv ${h.lv}`); e.ui.audio?.ok?.(); this.fx.push({ x: e.player.x, y: e.player.y - 170, t: 0, txt: "LEVEL UP", col: "#9be5a8", wide: true }); }
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
    for (const f of this.fx) { const k = f.t / 1.1; c.globalAlpha = 1 - k * k; if (f.ring) { const kk = Math.min(1, f.t / 0.6), R = (f.big ? 96 : 60) * (0.35 + 0.65 * kk); c.globalAlpha = 0.9 * (1 - kk); c.lineWidth = 4 + 3 * (1 - kk); c.strokeStyle = `rgba(${f.col},1)`; c.shadowColor = `rgba(${f.col},.9)`; c.shadowBlur = 12; c.beginPath(); c.ellipse(f.x, f.y - 4, R, R * 0.36, 0, 0, 6.3); c.stroke(); c.shadowBlur = 0; continue; }
      if (f.puff) { c.fillStyle = f.col; c.font = "700 22px system-ui"; c.fillText("✦", f.x - 14 - k * 18, f.y - k * 30); c.fillText("✦", f.x + 14 + k * 18, f.y - k * 24); continue; }
      c.font = (f.wide ? "700 12px system-ui" : f.big ? "900 20px system-ui" : "800 15px system-ui"); c.lineWidth = 3.5; c.strokeStyle = "rgba(30,20,36,.9)"; c.strokeText(f.txt, f.x, f.y - k * 38); c.fillStyle = f.col; c.fillText(f.txt, f.x, f.y - k * 38); }
    c.restore();
  }
}
