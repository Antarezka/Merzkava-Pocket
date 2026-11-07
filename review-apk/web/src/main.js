import { animate } from "animejs";
import "./styles.css";

const root = document.querySelector("#app");
if (!root) throw new Error("Pocket root not found.");

const native = window.PocketNative || null;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
let requestSequence = 0;
const callbacks = new Map();
let activeAccessAbort = null;
let accessIdentity = null;
let currentRoute = "login";
let currentDisposer = null;
let theme = readTheme();
let menuOpen = true;
let menuController = null;
let backPrompt = null;
let floatingReadiness = { displayOverApps:false, notifications:false, batteryExemption:false, serviceRunning:false, supported:false };
let floatingBusy = false;

window.PocketNativeCallbacks = {
  access(id, ok, displayName, identityRef, error) {
    const callback = callbacks.get(id);
    if (!callback) return;
    callbacks.delete(id);
    ok ? callback.resolve({ role:"developer", displayName, identityRef }) : callback.reject(new Error(error || "Developer access was not verified."));
  },
  player(id, ok, displayName, identityRef, error) {
    const callback = callbacks.get(id);
    if (!callback) return;
    callbacks.delete(id);
    ok ? callback.resolve({ role:"player", displayName, identityRef }) : callback.reject(new Error(error || "Player identity was not verified."));
  }
};

function readTheme() {
  try { return localStorage.getItem("mp-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("mp-theme", theme); } catch {}
  root.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  });
}
function setTheme(next) { theme = next === "light" ? "light" : "dark"; applyTheme(); }

function nativeReady() {
  try { return !!native && native.isNative() === true; } catch { return false; }
}
function invokeNative(method, args, signal) {
  if (!nativeReady() || typeof native[method] !== "function") return Promise.reject(new Error("Native Android access is unavailable. This APK must run on Android."));
  if (signal?.aborted) return Promise.reject(new DOMException("Access cancelled.", "AbortError"));
  const id = "pocket-" + (++requestSequence);
  return new Promise((resolve, reject) => {
    const finish = () => {
      callbacks.delete(id);
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      try { native.cancelPlayerIdentity?.(id); } catch {}
      reject(new DOMException("Access cancelled.", "AbortError"));
    };
    callbacks.set(id, {
      resolve: value => { finish(); resolve(value); },
      reject: error => { finish(); reject(error); }
    });
    signal?.addEventListener("abort", abort, { once:true });
    try { native[method](...args, id); }
    catch (error) { finish(); reject(error instanceof Error ? error : new Error("Native request failed.")); }
  });
}

function accessStages(role) {
  return role === "player"
    ? [
        ["Resolving character identity", "IDENTITY LOOKUP"],
        ["Reading the pinned Universe source", "UNIVERSE REGISTRY"],
        ["Checking the exact registered name", "EXACT NAME MATCH"],
        ["Recording the verified local identity", "LOCAL PROFILE INDEX"],
        ["Preparing the Player session", "PLAYER SESSION"],
        ["Finalizing access", "ACCESS HANDOFF"]
      ]
    : [
        ["Resolving Developer identity", "DEVELOPER ID"],
        ["Checking the local credential verifier", "PBKDF2 · SHA-256"],
        ["Applying Developer-only access", "ROLE ISOLATION"],
        ["Securing the optional remembered credentials", "ANDROID KEYSTORE"],
        ["Preparing the Developer session", "DEVELOPER SESSION"],
        ["Finalizing access", "ACCESS HANDOFF"]
      ];
}
const checkpoints = [15, 32, 51, 70, 88, 93];

function cancellableWait(ms, signal) {
  if (signal.aborted) return Promise.reject(new DOMException("Access cancelled.", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Access cancelled.", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once:true });
  });
}

async function runAccessSequence(role, operation, signal) {
  const overlay = root.querySelector("[data-access-buffer]");
  const rail = overlay.querySelector("[data-access-rail]");
  const number = overlay.querySelector("[data-access-number]");
  const message = overlay.querySelector("[data-access-message]");
  const label = overlay.querySelector("[data-access-label]");
  const animations = [];
  const reduced = reducedMotion();
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-active");
  rail.style.transform = "scaleX(0)";
  number.textContent = "00";
  const stages = accessStages(role);
  let settled = false;
  const resultPromise = Promise.resolve().then(operation).then(
    value => { settled = true; return { ok:true, value }; },
    error => { settled = true; return { ok:false, error }; }
  );
  const failFast = resultPromise.then(result => result.ok ? new Promise(() => {}) : Promise.reject(result.error));
  let progress = 0;
  try {
    for (let index=0; index<checkpoints.length; index++) {
      if (signal.aborted) throw new DOMException("Access cancelled.", "AbortError");
      const [copy, technical] = stages[index];
      label.textContent = technical;
      for (let dots=1; dots<=3; dots++) {
        message.textContent = copy + ".".repeat(dots);
        if (!reduced) animations.push(animate(message, { opacity:[.58,1], translateY:[4,0], duration:110, ease:"outCubic" }));
        if (dots === 1) {
          const target = checkpoints[index];
          const duration = 210 + Math.random()*170;
          if (reduced) rail.style.transform = "scaleX(" + target/100 + ")";
          else animations.push(animate(rail, { scaleX:[progress/100,target/100], duration, ease:"outSine" }));
          number.textContent = String(target).padStart(2,"0");
          await Promise.race([cancellableWait(duration, signal), failFast]);
          progress = target;
        } else {
          await Promise.race([cancellableWait(dots===2?74:115 + Math.random()*130, signal), failFast]);
        }
      }
    }
    let result;
    while (true) {
      result = await Promise.race([resultPromise, cancellableWait(170, signal).then(()=>null), failFast.then(()=>null)]);
      if (result) break;
      const stage = stages[stages.length-1][0];
      message.textContent = stage + ".".repeat(1 + (Math.floor(Date.now()/170)%3));
    }
    if (!result.ok) throw result.error;
    message.textContent = "Identity verified.";
    label.textContent = "ACCESS VERIFIED";
    number.textContent = "100";
    if (reduced) rail.style.transform = "scaleX(1)";
    else animations.push(animate(rail, { scaleX:[progress/100,1], duration:190, ease:"outCubic" }));
    await cancellableWait(reduced?0:200, signal);
    return result.value;
  } finally {
    animations.forEach(animation => animation.pause());
    overlay.classList.remove("is-active");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    rail.style.transform = "scaleX(0)";
  }
}

function renderLoginGate() {
  disposeCurrent();
  currentRoute = "login";
  accessIdentity = null;
  root.innerHTML = `
    <main class="login-stage" data-login-stage>
      <div class="login-topline">
        <span class="brand-overline">MERZKAVA <i></i> POCKET</span>
        <div class="theme-control">
          <button type="button" data-theme-choice="dark" aria-label="Dark theme" aria-pressed="false">◐</button>
          <button type="button" data-theme-choice="light" aria-label="White theme" aria-pressed="false">○</button>
        </div>
      </div>
      <section class="login-card" aria-labelledby="login-title">
        <div class="login-ornament"><span></span><i></i><span></span></div>
        <p class="eyebrow">ACCOUNT ACCESS <b>01 / 04</b></p>
        <h1 id="login-title">Enter the <em>Archive.</em></h1>
        <p class="login-description">Verify your identity before entering Merzkava Pocket.</p>
        <div class="access-tabs" role="tablist" aria-label="Login method">
          <button type="button" class="is-active" data-role-tab="player" role="tab" aria-selected="true">PLAYER</button>
          <button type="button" data-role-tab="developer" role="tab" aria-selected="false">DEVELOPER</button>
        </div>
        <form class="access-form" data-player-form>
          <label for="player-name">CHARACTER NAME</label>
          <input id="player-name" name="characterName" type="text" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Exact registered name" list="local-player-list" required>
          <datalist id="local-player-list"></datalist>
          <p class="field-note">Use the exact name in the currently pinned Universe registry. Previously verified local identities appear as suggestions.</p>
          <button type="submit" class="primary-action">VERIFY PLAYER IDENTITY <span>↗</span></button>
        </form>
        <form class="access-form" data-developer-form hidden>
          <label for="developer-id">DEVELOPER ID</label>
          <input id="developer-id" name="identifier" type="text" maxlength="80" autocomplete="username" required>
          <label for="developer-password">PASSWORD</label>
          <div class="password-wrap"><input id="developer-password" name="password" type="password" maxlength="128" autocomplete="current-password" required><button type="button" data-password-toggle aria-label="Show password">◉</button></div>
          <label class="remember-row"><input type="checkbox" name="remember"> <span>Remember on this device</span></label>
          <p class="field-note">Developer access uses the same local verifier as Merzkava APK. Remember Me is optional and Developer-only.</p>
          <button type="submit" class="primary-action">VERIFY DEVELOPER <span>↗</span></button>
        </form>
        <p class="login-message" data-login-message role="status" aria-live="polite"></p>
        <div class="login-footer"><span>PLAYER ACCESS</span><span>DEVELOPER ACCESS</span><span>SEPARATE ROLES</span></div>
      </section>
      <div class="access-buffer" data-access-buffer hidden aria-hidden="true">
        <div class="buffer-frame">
          <div class="buffer-top"><span>MERZKAVA POCKET</span><b>ACCESS ROUTINE</b></div>
          <div class="buffer-instrument">
            <div class="buffer-orbit"><i></i><b></b><span></span><em></em></div>
            <div class="buffer-medallion">M</div>
          </div>
          <div class="buffer-copy"><span data-access-label>IDENTITY LOOKUP</span><strong data-access-message>Resolving account identity.</strong></div>
          <div class="buffer-progress"><div class="buffer-progress-head"><span>ACCESS SEQUENCE</span><b data-access-number>00</b></div><div class="buffer-track"><i data-access-rail></i></div><small>VISUAL PACING · WAITING FOR VERIFIED RESULT</small></div>
          <button type="button" class="buffer-cancel" data-access-cancel>CANCEL ACCESS CHECK</button>
        </div>
      </div>
    </main>`;
  applyTheme();
  const stage = root.querySelector("[data-login-stage]");
  const message = stage.querySelector("[data-login-message]");
  const playerForm = stage.querySelector("[data-player-form]");
  const developerForm = stage.querySelector("[data-developer-form]");
  const tabs = [...stage.querySelectorAll("[data-role-tab]")];
  let busy = false;

  stage.querySelectorAll("[data-theme-choice]").forEach(button => button.addEventListener("click", () => setTheme(button.dataset.themeChoice)));
  const localNames = readLocalPlayerNames();
  const datalist = stage.querySelector("#local-player-list");
  datalist.innerHTML = localNames.map(name=>'<option value="'+escapeHtml(name)+'"></option>').join("");

  if (nativeReady()) {
    try {
      const raw = native.getRememberedDeveloperCredentials();
      if (raw) {
        const saved = JSON.parse(raw);
        stage.querySelector("#developer-id").value = saved.identifier || "";
        stage.querySelector("#developer-password").value = saved.password || "";
        stage.querySelector('[name="remember"]').checked = true;
      }
    } catch {}
  }
  stage.querySelector("[data-password-toggle]").addEventListener("click", event => {
    const input = stage.querySelector("#developer-password");
    input.type = input.type === "password" ? "text" : "password";
    event.currentTarget.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
  });
  const chooseRole = role => {
    if (busy) return;
    playerForm.hidden = role !== "player";
    developerForm.hidden = role !== "developer";
    tabs.forEach(button => {
      const active = button.dataset.roleTab === role;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    message.textContent = "";
  };
  tabs.forEach(button => button.addEventListener("click", () => chooseRole(button.dataset.roleTab)));
  const cancel = stage.querySelector("[data-access-cancel]");
  cancel.addEventListener("click", () => activeAccessAbort?.abort());

  const submit = async (event, role) => {
    event.preventDefault();
    if (busy) return;
    if (!nativeReady()) {
      message.textContent = "Android access adapter unavailable. This route remains locked.";
      return;
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("characterName") ?? "");
    const identifier = String(values.get("identifier") ?? "");
    const password = String(values.get("password") ?? "");
    if (role === "player" && !name) { message.textContent = "Enter the exact registered character name."; return; }
    if (role === "developer" && (!identifier || !password)) { message.textContent = "Enter both Developer ID and password."; return; }
    busy = true;
    stage.dataset.busy = "true";
    message.textContent = "";
    activeAccessAbort?.abort();
    activeAccessAbort = new AbortController();
    try {
      const identity = await runAccessSequence(role, () => role === "player"
        ? invokeNative("verifyPlayerIdentity", [name], activeAccessAbort.signal)
        : invokeNative("authenticateDeveloper", [identifier, password, values.get("remember") === "on"], activeAccessAbort.signal), activeAccessAbort.signal);
      accessIdentity = identity;
      showFloatingControl();
    } catch (error) {
      if (error?.name === "AbortError") message.textContent = "Access check cancelled.";
      else message.textContent = error instanceof Error ? error.message : "Access could not be verified.";
      if (!reducedMotion()) animate(message, { opacity:[.45,1], translateX:[-3,3,0], duration:260, ease:"outQuad" });
    } finally {
      busy = false;
      stage.dataset.busy = "false";
      activeAccessAbort = null;
    }
  };
  playerForm.addEventListener("submit", event => void submit(event,"player"));
  developerForm.addEventListener("submit", event => void submit(event,"developer"));
  const enter = stage.querySelector(".login-card");
  if (!reducedMotion()) animate(enter, { opacity:[0,1], translateY:[18,0], scale:[.985,1], duration:620, ease:"outCubic" });
  currentDisposer = () => { activeAccessAbort?.abort(); };
}

function readLocalPlayerNames() {
  if (!nativeReady()) return [];
  try {
    const raw = native.getLocalPlayerProfiles();
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data.map(item=>typeof item === "string" ? item : item.name).filter(Boolean) : [];
  } catch { return []; }
}

function disposeCurrent() {
  currentDisposer?.();
  currentDisposer = null;
  root.replaceChildren();
}

function crtMark() {
  return '<span class="crt-mark" aria-hidden="true"><i class="crt-antenna a"></i><i class="crt-antenna b"></i><i class="crt-casing"><b></b><em><i></i></em><u><s></s><s></s></u></i><i class="crt-foot f1"></i><i class="crt-foot f2"></i></span>';
}

function renderFloatingControl() {
  disposeCurrent();
  currentRoute = "floating";
  const identity = accessIdentity;
  if (!identity) return renderLoginGate();
  const supported = nativeReady();
  root.innerHTML = `
    <main class="floating-stage">
      <header class="floating-header">
        ${crtMark()}
        <div class="floating-brand"><span>MERZKAVA</span><small>POCKET · CONTROL / 02</small></div>
        <span class="header-state"><i></i>SESSION ACTIVE</span>
      </header>
      <div class="floating-welcome"><p class="eyebrow">WELCOME BACK · ${identity.role.toUpperCase()}</p><h1>Floating <em>Control.</em></h1><p>Prepare Pocket's Android access. Device permissions and account identity are separate checks.</p></div>
      <section class="floating-status-panel">
        <div class="status-panel-head"><span>DEVICE STATUS</span><small>LIVE ANDROID STATE</small></div>
        <div class="status-line" data-status="overlay"><span>Display over other apps</span><b>CHECKING</b></div>
        <div class="status-line" data-status="notifications"><span>Notifications</span><b>CHECKING</b></div>
        <div class="status-line" data-status="battery"><span>Background activity / battery</span><b>CHECKING</b></div>
        <div class="status-line" data-status="service"><span>Foreground service</span><b>CHECKING</b></div>
      </section>
      <div class="section-label"><span>INITIAL SETUP</span><small>01 — 03 · COMPLETE IN ORDER</small></div>
      <section class="setup-list">
        <article class="setup-row" data-step="overlay"><span class="step-no">01</span><div><strong>Display over other apps</strong><small>Allow Pocket to appear above other apps.</small></div><button type="button" data-permission="overlay">ALLOW ↗</button></article>
        <article class="setup-row" data-step="notifications"><span class="step-no">02</span><div><strong>Notifications</strong><small>Allow the ongoing Floating Control notification.</small></div><button type="button" data-permission="notifications" disabled>ALLOW ↗</button></article>
        <article class="setup-row" data-step="battery"><span class="step-no">03</span><div><strong>Background activity / battery</strong><small>Reduce the chance Android stops Floating Mode.</small></div><button type="button" data-permission="battery" disabled>ALLOW ↗</button></article>
      </section>
      <div class="section-label"><span>QUICK ACTIONS</span><small>SESSION CONTROLS</small></div>
      <section class="floating-actions">
        <button class="continue-action" type="button" data-action="continue"><span><small>ENTER POCKET</small><strong>Open game / continue playing</strong></span><b>↗</b></button>
        <button type="button" data-action="bubble" disabled><span><small>FLOATING MODE</small><strong>Start bubble mode</strong></span><b>↗</b></button>
        <button type="button" data-action="mini" disabled><span><small>WINDOW</small><strong>Open floating mini window</strong></span><b>↗</b></button>
        <button type="button" data-action="stop" disabled><span><small>SERVICE</small><strong>Stop service and close window</strong></span><b>×</b></button>
      </section>
      <p class="floating-feedback" role="status" aria-live="polite" data-floating-feedback></p>
      <footer class="floating-footer"><span>MERZKAVA POCKET</span><span>${escapeHtml(identity.displayName)} · ${identity.role.toUpperCase()}</span></footer>
      <button type="button" class="signout-action" data-signout>LOCK / SIGN OUT</button>
    </main>`;
  const stage = root.querySelector(".floating-stage");
  const reduce = reducedMotion();
  if (!reduce) {
    animate(stage.querySelector(".floating-header"), { opacity:[0,1], translateY:[-8,0], duration:400, ease:"outCubic" });
    animate(stage.querySelector(".floating-welcome"), { opacity:[0,1], translateY:[12,0], delay:80, duration:470, ease:"outCubic" });
    const rows = [...stage.querySelectorAll(".setup-row")];
    rows.forEach((row,index)=>animate(row,{opacity:[0,1],translateX:[10,0],delay:180+index*70,duration:350,ease:"outCubic"}));
    animate(stage.querySelector(".floating-actions"),{opacity:[0,1],translateY:[10,0],delay:360,duration:420,ease:"outCubic"});
  }
  let disposed = false;
  const feedback = stage.querySelector("[data-floating-feedback]");
  const renderReadiness = state => {
    floatingReadiness = state;
    const status = {
      overlay: state.displayOverApps,
      notifications: state.notifications,
      battery: state.batteryExemption,
      service: state.serviceRunning
    };
    for (const [key,ready] of Object.entries(status)) {
      const line=stage.querySelector('[data-status="'+key+'"]');
      const value=key==="service" ? (ready?"RUNNING":"STOPPED") : (!state.supported?"UNSUPPORTED":(ready?"READY":"NOT READY"));
      line.querySelector("b").textContent=value;
      line.classList.toggle("is-ready",!!ready);
      line.classList.toggle("is-unsupported",!state.supported);
    }
    const steps = ["overlay","notifications","battery"];
    steps.forEach((key,index)=>{
      const button=stage.querySelector('[data-permission="'+key+'"]');
      const ready=status[key];
      const priorOk=index===0 || steps.slice(0,index).every(name=>status[name]);
      button.disabled=!!ready || !state.supported || !priorOk || floatingBusy;
      button.textContent=ready?"READY ✓":"ALLOW ↗";
      button.closest(".setup-row").classList.toggle("is-complete",!!ready);
    });
    stage.querySelector('[data-action="bubble"]').disabled=!state.supported || !(state.displayOverApps&&state.notifications&&state.batteryExemption) || floatingBusy;
    stage.querySelector('[data-action="mini"]').disabled=!state.supported || !state.displayOverApps || floatingBusy;
    stage.querySelector('[data-action="stop"]').disabled=!state.supported || !state.serviceRunning || floatingBusy;
    stage.querySelector('[data-action="continue"]').disabled=false;
  };
  const refresh = async () => {
    if (!nativeReady()) {
      renderReadiness({displayOverApps:false,notifications:false,batteryExemption:false,serviceRunning:false,supported:false});
      return;
    }
    try { renderReadiness(JSON.parse(native.getReadiness())); }
    catch { renderReadiness({displayOverApps:false,notifications:false,batteryExemption:false,serviceRunning:false,supported:false}); }
  };
  const run = async action => {
    if (floatingBusy || disposed) return;
    floatingBusy=true;
    feedback.textContent="CHECKING DEVICE STATE…";
    renderReadiness(floatingReadiness);
    try {
      await action();
      await refresh();
      feedback.textContent="DEVICE STATE REFRESHED.";
    } catch(error) {
      feedback.textContent=error instanceof Error?error.message:"Android action failed.";
      await refresh();
    } finally {
      floatingBusy=false;
      renderReadiness(floatingReadiness);
    }
  };
  stage.querySelectorAll("[data-permission]").forEach(button=>button.addEventListener("click",()=>{
    const key=button.dataset.permission;
    void run(async()=>{
      if (key==="overlay") native.requestOverlayPermission();
      else if (key==="notifications") native.requestNotifications();
      else native.requestBatteryExemption();
      feedback.textContent="COMPLETE THE ANDROID SYSTEM STEP, THEN RETURN TO POCKET.";
    });
  }));
  stage.querySelector('[data-action="continue"]').addEventListener("click",showSplash);
  stage.querySelector('[data-action="bubble"]').addEventListener("click",()=>void run(async()=>{if(!native.startBubbleMode())throw new Error("Floating bubble could not start. Verify the overlay permission.");}));
  stage.querySelector('[data-action="mini"]').addEventListener("click",()=>void run(async()=>{if(!native.openMiniWindow())throw new Error("Mini window could not open. Verify the overlay permission.");}));
  stage.querySelector('[data-action="stop"]').addEventListener("click",()=>void run(async()=>native.stopFloatingMode()));
  stage.querySelector("[data-signout]").addEventListener("click",()=>void signOut());
  const resume = () => { if (!disposed) void refresh(); };
  window.addEventListener("pocket:native-resume",resume);
  window.addEventListener("focus",resume);
  void refresh();
  currentDisposer=()=>{disposed=true;window.removeEventListener("pocket:native-resume",resume);window.removeEventListener("focus",resume);};
}

function showFloatingControl() {
  renderFloatingControl();
}

function showSplash() {
  disposeCurrent();
  currentRoute="splash";
  root.innerHTML = `
    <main class="splash-stage" data-splash>
      <div class="splash-vignette"></div><div class="splash-light"></div>
      <div class="splash-copy"><span class="splash-kicker">A LITTLE WORLD, ALWAYS WITHIN REACH</span><div class="splash-logo">MERZKAVA</div><span class="splash-rule"></span><span class="splash-subtitle">POCKET</span><small class="splash-foot">THE ARCHIVE OPENS</small></div>
      <span class="splash-corner corner-a"></span><span class="splash-corner corner-b"></span>
    </main>`;
  const stage=root.querySelector("[data-splash]");
  const content=stage.querySelector(".splash-copy");
  const logo=stage.querySelector(".splash-logo");
  const rule=stage.querySelector(".splash-rule");
  let cancelled=false;
  const animations=[];
  const complete=()=>{
    if(cancelled)return;
    renderHome();
  };
  const run=async()=>{
    if(reducedMotion()){
      stage.style.opacity="1";content.style.opacity="1";logo.style.opacity="1";await wait(850);
    }else{
      await new Promise(resolve=>animations.push(animate(stage,{opacity:[0,1],duration:430,ease:"outCubic",onComplete:resolve})));
      if(cancelled)return;
      animations.push(animate(content,{opacity:[0,1],translateY:[12,0],duration:620,ease:"outCubic"}));
      animations.push(animate(logo,{opacity:[0,1],scale:[.975,1],duration:780,delay:150,ease:"outCubic"}));
      animations.push(animate(rule,{scaleX:[0,1],duration:520,delay:440,ease:"outCubic"}));
      await wait(1700);
    }
    if(cancelled)return;
    if(!reducedMotion()){
      animations.push(animate(content,{opacity:[1,0],translateY:[0,-7],duration:350,ease:"inOutCubic"}));
      await new Promise(resolve=>animations.push(animate(stage,{opacity:[1,0],duration:480,delay:50,ease:"inOutCubic",onComplete:resolve})));
    }else stage.style.opacity="0";
    complete();
  };
  void run();
  currentDisposer=()=>{cancelled=true;animations.forEach(item=>item.pause());};
}

function renderHome() {
  renderPage("home");
}
function renderPage(destination, depth="") {
  disposeCurrent();
  currentRoute=destination;
  menuOpen=true;
  let pageMarkup="";
  if(destination==="home"){
    pageMarkup=`
      <main class="home-stage">
        <header class="home-topline"><span class="micro-brand">MERZKAVA POCKET</span><div class="home-theme"><button data-theme-choice="dark" aria-pressed="false">DARK</button><button data-theme-choice="light" aria-pressed="false">WHITE</button></div></header>
        <section class="home-brand"><span class="brand-kicker">THE POCKET ARCHIVE</span><h1>MERZKAVA</h1><span class="home-subtitle">A LITTLE WORLD, ALWAYS WITHIN REACH</span><div class="brand-divider"><i></i><span></span><i></i></div></section>
        <section class="home-content">
          <span class="eyebrow">HOME / OVERVIEW</span>
          <h2>Welcome back.</h2>
          <p>Your Pocket archive is ready.</p>
          <article class="home-feature"><span>YOUR SPACE</span><strong>Home Base</strong><small>Your journey and records stay here.</small></article>
        </section>
        <footer class="home-foot"><span>LOCAL POCKET SHELL</span><span>${accessIdentity?.role.toUpperCase()||"SESSION"}</span></footer>
      </main>`;
  } else if(destination==="game"){
    pageMarkup=`
      <main class="page-stage">
        <span class="eyebrow">GAME / WORLD ACCESS</span><h1>Enter the world.</h1><p class="page-lead">World navigation follows the Pocket hierarchy.</p>
        <article class="destination-card"><span>01 / GAME ENTRY</span><strong>Home Base</strong><small>The starting hub for in-world navigation.</small><button type="button" data-subroute="home-base">OPEN HOME BASE ↗</button></article>
      </main>`;
  } else if(destination==="home-base"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">GAME / HOME BASE</span><h1>Home Base.</h1><p class="page-lead">Your local starting hub.</p>
      <article class="destination-card"><span>02 / CITY NAVIGATION</span><strong>City</strong><small>Continue into the connected city layer.</small><button data-subroute="city">OPEN CITY ↗</button></article></main>`;
  } else if(destination==="city"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">GAME / CITY</span><h1>City.</h1><p class="page-lead">Choose a connected destination from the city layer.</p>
      <article class="destination-card"><span>03 / WORLD SCALE</span><strong>World Map</strong><small>World-scale geography belongs inside Game.</small><button data-subroute="world-map">OPEN WORLD MAP ↗</button></article></main>`;
  } else if(destination==="world-map"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">GAME / WORLD MAP</span><h1>World Map.</h1><p class="page-lead">The map data is not included in this shell build.</p>
      <article class="destination-card"><span>WORLD ATLAS</span><strong>Geographic layer</strong><small>Map content will be connected from the reviewed Universe sources; no placeholder geography is invented here.</small><button data-subroute="city">RETURN TO CITY ↗</button></article></main>`;
  } else if(destination==="daily-login"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">DAILY LOG-IN / RECORD</span><h1>A new day begins.</h1><p class="page-lead">Your daily check-in has its own dedicated destination.</p>
      <article class="destination-card"><span>DAILY RECORD</span><strong>Log-in calendar</strong><small>Reward history and claim results will use authoritative local records.</small></article></main>`;
  } else {
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">SETTINGS / PREFERENCES</span><h1>Make it yours.</h1><p class="page-lead">Display and account controls.</p>
      <article class="destination-card"><span>DISPLAY THEME</span><strong>Dark / White</strong><div class="theme-options"><button data-theme-choice="dark" aria-pressed="false">DARK THEME</button><button data-theme-choice="light" aria-pressed="false">WHITE THEME</button></div></article>
      <article class="destination-card account-card"><span>ACCOUNT & ACCESS</span><strong>${escapeHtml(accessIdentity?.displayName||"Pocket User")}</strong><small>${(accessIdentity?.role||"player").toUpperCase()} SESSION</small><button class="logout-button" data-signout>LOCK / SIGN OUT</button></article></main>`;
  }
  root.innerHTML = pageMarkup + navigationMarkup();
  applyTheme();
  root.querySelectorAll("[data-theme-choice]").forEach(button=>button.addEventListener("click",()=>setTheme(button.dataset.themeChoice)));
  root.querySelectorAll("[data-subroute]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.subroute)));
  root.querySelector("[data-signout]")?.addEventListener("click",()=>void signOut());
  const page=root.querySelector(".home-stage,.page-stage");
  if(!reducedMotion()&&page)animate(page,{opacity:[0,1],translateY:[8,0],duration:420,ease:"outCubic"});
  mountMenu();
}

function navigationMarkup() {
  return `
    <div class="pull-cord-zone" data-pull-cord>
      <svg class="cord-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-cord-path d="M28 0 C28 28 28 70 28 112"/></svg>
      <button class="cord-handle" type="button" data-cord-handle aria-label="Drag pull-cord handle" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="cord-tv"><i class="antenna a"></i><i class="antenna b"></i><i class="tv-case"><b></b><em></em><u><s></s><s></s></u></i><i class="tv-foot left"></i><i class="tv-foot right"></i></span></button>
      <span class="cord-instruction" data-cord-instruction>PULL &amp; RELEASE AT THE BOTTOM</span>
      <div class="release-zone" data-release-zone><span class="release-line"></span><b>RELEASE TO TOGGLE MENU</b><small>DROP THE HANDLE INSIDE THIS ZONE</small></div>
    </div>
    <div class="dock-wrap" data-dock><div class="dock-back"></div><div class="dock-brushes"><i></i><i></i><i></i><i></i></div>
      <nav class="dock-front" aria-label="Main navigation">
        <button class="dock-item is-active" type="button" data-destination="home" aria-current="page"><span class="dock-sigil"><svg viewBox="0 0 24 24"><path d="M3.5 11.2 12 4l8.5 7.2M6.5 10.3v9h11v-9M10 19.3v-5.7h4v5.7"/></svg></span><b>HOME</b></button>
        <button class="dock-item" type="button" data-destination="game"><span class="dock-sigil"><svg viewBox="0 0 24 24"><path d="M12 2.5 20.5 12 12 21.5 3.5 12 12 2.5Z"/><path d="m12 6.5 4.8 5.5-4.8 5.5-4.8-5.5L12 6.5Z"/><path d="M12 2.5v19M3.5 12h17"/></svg></span><b>GAME</b></button>
        <button class="dock-item" type="button" data-destination="daily-login"><span class="dock-sigil"><svg viewBox="0 0 24 24"><path d="m12 2.5 2.2 5.5 5.8 1-4.2 4.2 1 6-4.8-2.8-4.8 2.8 1-6L4 9l5.8-1L12 2.5Z"/></svg></span><b>DAILY LOG-IN</b></button>
        <button class="dock-item" type="button" data-destination="settings"><span class="dock-sigil"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1"/><circle cx="12" cy="12" r="8.7"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg></span><b>SETTINGS</b></button>
      </nav>
    </div>
    <button class="dock-scrim" data-dock-scrim tabindex="-1" aria-label="Close navigation"></button>`;
}

function mountMenu() {
  const zone=root.querySelector("[data-pull-cord]");
  const handle=zone.querySelector("[data-cord-handle]");
  const path=zone.querySelector("[data-cord-path]");
  const dock=zone.parentElement.querySelector("[data-dock]");
  const scrim=zone.parentElement.querySelector("[data-dock-scrim]");
  const release=zone.querySelector("[data-release-zone]");
  const instruction=zone.querySelector("[data-cord-instruction]");
  const tiles=[...dock.querySelectorAll("[data-destination]")];
  let pointerId=null, start={x:0,y:0}, current={x:0,y:0}, rest={x:0,y:112}, dragged=false, disposed=false, idle=null, recoil=null;
  const bounds=()=>({w:window.innerWidth,h:window.innerHeight});
  const cordSvg=zone.querySelector(".cord-svg");
  const syncLayout=()=>{const b=bounds();cordSvg.setAttribute("viewBox",`0 0 ${b.w} ${b.h}`);rest={x:b.w*.25,y:112};if(pointerId===null)draw(rest);};
  const clamp=(x,y)=>{const b=bounds();return{x:Math.max(25,Math.min(b.w-25,x)),y:Math.max(30,Math.min(b.h-28,y))};};
  const draw=point=>{
    current={...point};
    const dx=point.x-rest.x,dy=point.y;
    path.setAttribute("d",`M ${rest.x} 0 C ${rest.x+dx*.08} ${dy*.42}, ${point.x-dx*.14} ${point.y-dy*.28}, ${point.x} ${point.y}`);
    handle.style.left=point.x+"px";handle.style.top=point.y+"px";
  };
  const setMenu=next=>{
    if(disposed||menuOpen===next)return;
    menuOpen=next;dock.classList.toggle("is-open",next);dock.classList.toggle("is-closed",!next);
    scrim.classList.toggle("is-visible",next);
    scrim.disabled=!next;
    tiles.forEach(tile=>{tile.inert=!next;tile.tabIndex=next?0:-1;});
    idle?.pause();idle=null;
    if(reducedMotion()){dock.style.transform=next?"translateY(0)":"translateY(130%)";dock.style.opacity=next?"1":"0";if(!next)startIdle();return;}
    if(next){
      animate(dock,{translateY:["108%","-2%","0%"],opacity:[0,1],duration:500,ease:"outCubic"});
      tiles.forEach((tile,index)=>animate(tile,{opacity:[0,1],translateY:[10,0],delay:130+index*55,duration:280,ease:"outCubic"}));
    }else{
      [...tiles].reverse().forEach((tile,index)=>animate(tile,{opacity:[1,0],translateY:[0,5],delay:index*28,duration:180,ease:"inCubic"}));
      animate(dock,{translateY:["0%","105%"],opacity:[1,0],delay:60,duration:330,ease:"inCubic",onComplete:startIdle});
    }
  };
  const startIdle=()=>{
    if(disposed||pointerId!==null||reducedMotion()||idle)return;
    const drift={y:0};
    idle=animate(drift,{y:[0,1.8,0],duration:3400,ease:"inOutSine",loop:true,onUpdate:()=>{if(pointerId===null&&!disposed)draw({x:rest.x,y:rest.y+drift.y});}});
  };
  const showZone=active=>{
    release.style.height=Math.min(176,Math.max(112,bounds().h*.17))+"px";
    release.classList.toggle("is-active",active);
    if(!active)release.classList.remove("is-targeted");
    instruction.textContent=active?"DRAG THE TV AND DROP BELOW":"PULL & RELEASE AT THE BOTTOM";
  };
  const snapBack=activate=>{
    showZone(false);handle.classList.remove("is-dragging");
    idle?.pause();idle=null;
    if(activate)setMenu(!menuOpen);
    if(reducedMotion()){draw(rest);startIdle();return;}
    const spring={x:current.x,y:current.y};
    recoil=animate(spring,{x:rest.x,y:rest.y,duration:690,ease:"outElastic(1,.55)",onUpdate:()=>draw({x:spring.x,y:spring.y}),onComplete:()=>{draw(rest);startIdle();}});
  };
  const begin=point=>{
    start={...point};draw(point);dragged=false;idle?.pause();idle=null;recoil?.pause();handle.classList.add("is-dragging");showZone(true);
  };
  const update=point=>{
    const p=clamp(point.x,point.y);
    if(Math.hypot(p.x-start.x,p.y-start.y)>=7)dragged=true;
    draw(p);
    const inZone=p.y>=bounds().h-Math.min(176,Math.max(112,bounds().h*.17));
    release.classList.toggle("is-targeted",inZone);
    instruction.textContent=inZone?"RELEASE TO TOGGLE MENU":"DROP THE HANDLE IN THE LOWER ZONE";
    handle.setAttribute("aria-valuenow",String(Math.round((p.y/bounds().h)*100)));
  };
  const down=event=>{
    if(disposed||pointerId!==null||event.button!==0)return;
    event.preventDefault();pointerId=event.pointerId;
    begin(clamp(event.clientX,event.clientY));
    handle.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    if(pointerId!==event.pointerId)return;
    event.preventDefault();update(clamp(event.clientX,event.clientY));
  };
  const up=(event,cancelled)=>{
    if(pointerId!==event.pointerId)return;
    const inZone=event.clientY>=bounds().h-Math.min(176,Math.max(112,bounds().h*.17));
    const activate=!cancelled&&dragged&&inZone;
    pointerId=null;handle.releasePointerCapture?.(event.pointerId);snapBack(activate);
    handle.setAttribute("aria-valuenow","0");
  };
  handle.addEventListener("pointerdown",down);
  handle.addEventListener("pointermove",move);
  handle.addEventListener("pointerup",event=>up(event,false));
  handle.addEventListener("pointercancel",event=>up(event,true));
  handle.addEventListener("lostpointercapture",event=>{if(pointerId===event.pointerId)up(event,true);});
  handle.addEventListener("keydown",event=>{
    if(event.key===" "&&!event.repeat&&pointerId===null){event.preventDefault();pointerId=-1;begin(current);}
    else if(pointerId===-1){const step=event.shiftKey?90:48;const p={...current};if(event.key==="ArrowDown")p.y+=step;else if(event.key==="ArrowUp")p.y-=step;else if(event.key==="ArrowLeft")p.x-=step;else if(event.key==="ArrowRight")p.x+=step;else if(event.key===" "){event.preventDefault();const activate=p.y>=bounds().h-120;pointerId=null;snapBack(activate);return;}else return;event.preventDefault();update(p);}
  });
  tiles.forEach(tile=>tile.addEventListener("click",()=>{
    const destination=tile.dataset.destination;
    navigate(destination);
  }));
  scrim.addEventListener("click",()=>setMenu(false));
  menuController={setMenu,get open(){return menuOpen;},close:()=>setMenu(false)};
  dock.classList.add("is-open");scrim.classList.add("is-visible");
  tiles.forEach(tile=>{tile.inert=false;tile.tabIndex=0;});
  syncLayout();
  const resizeHandler=()=>syncLayout();window.addEventListener("resize",resizeHandler);
  draw(rest);startIdle();
  currentDisposer=()=>{window.removeEventListener("resize",resizeHandler);
    disposed=true;idle?.pause();recoil?.pause();
    handle.removeEventListener("pointerdown",down);handle.removeEventListener("pointermove",move);
    if(pointerId!==null){try{handle.releasePointerCapture(pointerId);}catch{}}
    menuController=null;
  };
}

function navigate(destination) {
  if(!["home","game","daily-login","settings","home-base","city","world-map"].includes(destination))return;
  if(destination===currentRoute)return;
  const previous=currentRoute;
  renderPage(destination);
  const dock=root.querySelector("[data-dock]");
  if(dock&&menuController?.open)menuController.close();
  const page=root.querySelector(".home-stage,.page-stage");
  if(!reducedMotion()&&page)animate(page,{opacity:[0,1],translateX:[8,0],duration:360,ease:"outCubic"});
}

async function signOut() {
  if (!nativeReady()) return;
  if (accessIdentity?.role==="developer") {
    try { native.lockDeveloperSession(); } catch {}
  }
  accessIdentity=null;
  floatingReadiness={displayOverApps:false,notifications:false,batteryExemption:false,serviceRunning:false,supported:false};
  renderLoginGate();
}

window.addEventListener("pocket:android-back",()=>{
  if(currentRoute==="login")return;
  if(currentRoute==="floating"){void signOut();return;}
  if(currentRoute==="splash")return;
  if(backPrompt){backPrompt.remove();backPrompt=null;return;}
  if(menuController?.open){menuController.close();return;}
  if(currentRoute!=="home"){
    if(currentRoute==="world-map")return navigate("city");
    if(currentRoute==="city")return navigate("home-base");
    if(currentRoute==="home-base")return navigate("game");
    return navigate("home");
  }
  backPrompt=document.createElement("div");
  backPrompt.className="exit-prompt";
  backPrompt.innerHTML='<section role="dialog" aria-modal="true"><span class="eyebrow">MERZKAVA POCKET</span><h2>Leave the Archive?</h2><p>Close Pocket and end this app session?</p><div><button data-stay>STAY</button><button data-exit>EXIT</button></div></section>';
  root.append(backPrompt);
  backPrompt.querySelector("[data-stay]").addEventListener("click",()=>{backPrompt?.remove();backPrompt=null;});
  backPrompt.querySelector("[data-exit]").addEventListener("click",()=>{try{native.exitApp();}catch{}});
});
window.addEventListener("keydown",event=>{if(event.key==="Escape")window.dispatchEvent(new Event("pocket:android-back"));});
applyTheme();
renderLoginGate();
