// Sim clock: x48. 1 sim day = 30 real minutes (1440 / 48). Day starts 06:00.
export const SIM_RATE = 48;
export const DAY_MIN = 1440;
export const DAY_START = 360;
export const realMsToSimMin = ms => ms / 60000 * SIM_RATE;
export const simMinToRealMs = m => m * 60000 / SIM_RATE;
/** state.clock = { anchor_real_ms, anchor_sim_min }; sim-min since world start (day 0 06:00 = 0 offset by DAY_START). */
export const makeClock = (now = Date.now()) => ({ anchor_real_ms: now, anchor_sim_min: DAY_START });
export const simNow = (state, now = Date.now()) => state.clock.anchor_sim_min + realMsToSimMin(Math.max(0, now - state.clock.anchor_real_ms));
export const dayIndex = m => Math.floor(m / DAY_MIN);
export const minuteOfDay = m => ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
export function formatClock(m) {
  const mod = Math.floor(minuteOfDay(m));
  return String(Math.floor(mod / 60)).padStart(2, "0") + ":" + String(mod % 60).padStart(2, "0");
}
/** Developer time skip: shifts the anchor so simNow advances by `simMin`. */
export const skipSim = (state, simMin) => { state.clock.anchor_sim_min += simMin; };
