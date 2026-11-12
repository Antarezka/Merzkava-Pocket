import { animate, engine } from "animejs";
import "./styles.css";
import { economyMarkup, mountEconomy, startPocketGiftRuntime, stopPocketGiftRuntime } from "./economy.js";
import { mountHomeBase, setHomeBaseRenderSuspended } from "./home-base.js";
import { dailyLoginMarkup, mountDailyLogin } from "./daily-login.js";
import { playerRecordsMarkup, mountPlayerRecords } from "./player-records.js";
import { getAccessDiagnostics, getDiagnosticWordFrames, formatDiagnosticFrame } from "./access-diagnostics.js";
import { renderFoxSplashMarkup, mountFoxSplashMotion } from "./splash-screen/splash-screen.js";
import { createTurntableMotion, createVinylDesignController, VINYL_STYLES } from "./audio-player.js";
import { createPocketAudioDirector } from "./pocket-audio-director.js";
import "./splash-screen/splash-screen.css";

const root = document.querySelector("#app");
if (!root) throw new Error("Pocket root not found.");
const native = window.PocketNative || null;
function readNativeMusicLibrary() {
  try {
    const tracks = JSON.parse(native?.getCustomMusicLibrary?.() || "[]");
    return Array.isArray(tracks) ? tracks : [];
  } catch { return []; }
}
let activeTurntableMotion = null;
let activeRecordFlight = null;
let pendingRecordPlacement = "";
const vinylDesigns = createVinylDesignController({ onChange: syncAudioUI });
const audioDirector = createPocketAudioDirector({
  native,
  customTracks: readNativeMusicLibrary(),
  onChange: syncAudioUI,
  onPlaybackCycle: () => {
    if (vinylDesigns.getState().mode === "auto") vinylDesigns.rotateRandom("track-end");
  }
});
window.addEventListener("pocket:audio-effect", event => {
  const effect = String(event.detail?.effect || "").trim().toLowerCase();
  audioDirector.playEffect(effect);
});
window.addEventListener("pocket:season-start", event => {
  const seasonKey = event.detail?.seasonId ?? event.detail?.seasonKey ?? "";
  vinylDesigns.onSeasonStart(seasonKey);
});
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
let requestSequence = 0;
const callbacks = new Map();
let activeAccessAbort = null;
let accessIdentity = null;
let currentRoute = "login";
const routeHistory = [];
let currentDisposer = null;
let theme = readTheme();
let paperGlow = readPaperGlow();
let menuOpen = true;
let menuController = null;
let backPrompt = null;
let floatingReadiness = { displayOverApps:false, notifications:false, batteryExemption:false, serviceRunning:false, bubbleVisible:false, supported:false };
let floatingBusy = false;
let bubbleVisualSuspended = false;

function applyFloatingRenderMode(mode) {
  if (mode !== "bubble" && mode !== "window" && mode !== "full") return;
  bubbleVisualSuspended = mode === "bubble";
  document.body.classList.toggle("bubble-render-paused", bubbleVisualSuspended);
  // A mini window remains visible above other apps even while the Activity is backgrounded.
  engine.pauseOnDocumentHidden = mode !== "window";
  if (bubbleVisualSuspended) engine.pause();
  else engine.resume();
  // The CRI player keeps running in every window mode; only this visual RAF is
  // suspended while the TV bubble hides the WebView.
  activeTurntableMotion?.setRenderEnabled(!bubbleVisualSuspended);
  setHomeBaseRenderSuspended(bubbleVisualSuspended);
}

window.addEventListener("pocket:render-mode", event => {
  applyFloatingRenderMode(event.detail?.mode);
});

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
  },
  registry(id, ok, namesJson, identityRef, error) {
    const callback = callbacks.get(id);
    if (!callback) return;
    callbacks.delete(id);
    if (!ok) {
      callback.reject(new Error(error || "The Universe player registry could not be refreshed."));
      return;
    }
    try {
      const names = JSON.parse(namesJson || "[]");
      callback.resolve({ names:Array.isArray(names) ? names : [], identityRef });
    } catch {
      callback.reject(new Error("The verified player registry response was malformed."));
    }
  },
  audioState(channel, state, error, generation) {
    audioDirector.updateNativeState(channel, state, error, generation);
    syncAudioUI();
  },
  mediaControl(command, value) {
    audioDirector.handleMediaControl(command, value);
    syncAudioUI();
  },
  updateCheck(id, ok, updateJson, error) {
    const callback = callbacks.get(id);
    if (!callback) return;
    callbacks.delete(id);
    if (!ok) {
      callback.reject(new Error(error || "Pocket could not check for updates."));
      return;
    }
    try {
      callback.resolve(JSON.parse(updateJson || "{}"));
    } catch {
      callback.reject(new Error("The Pocket update information was malformed."));
    }
  }
};


let latestPocketUpdate = null;
let pocketUpdateCheckBusy = false;
let pocketUpdateStartupCheckStarted = false;


function nativePocketAppInfo() {
  try { const value=JSON.parse(native?.getPocketAppInfo?.()||"{}");return value&&typeof value==="object"?value:{}; }
  catch { return {}; }
}
function nativePocketStorageInfo() {
  try { const value=JSON.parse(native?.getPocketStorageInfo?.()||"{}");return value&&typeof value==="object"?value:{}; }
  catch { return {}; }
}
function formatPocketBytes(value) {
  const bytes=Math.max(0,Number(value)||0);
  if(bytes<1024)return Math.round(bytes)+" B";
  const units=["KB","MB","GB","TB"];let amount=bytes/1024,index=0;
  while(amount>=1024&&index<units.length-1){amount/=1024;index+=1;}
  return amount.toFixed(amount>=100?0:amount>=10?1:2)+" "+units[index];
}
function showPocketUpdateNotification(update) {
  if(!update?.hasUpdate)return false;
  const build=Number(update.buildNumber)||0;if(!build)return false;
  const key="mp-update-notified-build";
  try{if(localStorage.getItem(key)===String(build))return false;}catch{}
  const notes=Array.isArray(update.notes)?update.notes:[];
  const releaseLines=notes.slice(0,4).map(note=>"• "+String(note||"").trim()).filter(line=>line!=="•");
  const details=releaseLines.join("\n")||"A new Merzkava Pocket build is ready. Open Pocket Settings → Pocket Update to review and install it.";
  let shown=false;
  try{shown=native?.showPocketUpdateNotification?.(
   build,String(update.versionName||"Pocket update"),details,theme,Number(update.apkSizeBytes)||0,
   String(update.apkUrl||""),String(update.apkName||""),String(update.apkSha256||"")
  )===true;}catch{}
  if(shown){try{localStorage.setItem(key,String(build));}catch{}}
  return shown;
}
async function checkPocketUpdates(notifyOnAvailable=false) {
  if(!nativeReady()||pocketUpdateCheckBusy)return latestPocketUpdate;
  pocketUpdateCheckBusy=true;
  const controller=new AbortController();
  const timeoutId=window.setTimeout(()=>controller.abort(),45000);
  try {
    const update=await invokeNative("checkPocketUpdate",[],controller.signal);
    latestPocketUpdate=update&&typeof update==="object"?update:{error:"The Pocket update response was empty."};
    if(notifyOnAvailable)showPocketUpdateNotification(latestPocketUpdate);
    refreshPocketUpdatePanel();return latestPocketUpdate;
  } catch(error) {
    const timedOut=controller.signal.aborted||error?.name==="AbortError";
    if(!latestPocketUpdate||timedOut)latestPocketUpdate={...(latestPocketUpdate||{}),
      error:timedOut?"UPDATE CHECK TIMED OUT · CHECK YOUR CONNECTION AND TRY AGAIN."
        :(error instanceof Error?error.message:"Update check failed.")};
    refreshPocketUpdatePanel();return null;
  } finally {
    window.clearTimeout(timeoutId);
    pocketUpdateCheckBusy=false;
    refreshPocketUpdatePanel();
  }
}
function refreshPocketUpdatePanel(downloadState=null) {
  const panel=root.querySelector("[data-update-section]");if(!panel)return;
  const appInfo=nativePocketAppInfo(),storage=nativePocketStorageInfo();
  const currentBuild=Number(appInfo.buildNumber)||0,latest=latestPocketUpdate;
  const availableBuild=Number(latest?.buildNumber)||0,hasUpdate=latest?.hasUpdate===true&&availableBuild>currentBuild;
  const q=s=>panel.querySelector(s);
  const set=(selector,value)=>{const node=q(selector);if(node)node.textContent=value;};
  set("[data-update-current-build]",currentBuild?"#"+currentBuild:"UNKNOWN");
  set("[data-update-latest-build]",availableBuild?"#"+availableBuild:"—");
  set("[data-update-version]",latest?.versionName||appInfo.versionName||"Version information unavailable");
  set("[data-update-size]",latest?.apkSizeBytes>0?formatPocketBytes(latest.apkSizeBytes):"—");
  let status="CHECKING FOR UPDATES",tone="checking";
  if(latest?.error){status="UPDATE CHECK UNAVAILABLE";tone="warning";}
  else if(latest&&hasUpdate){status="NEW POCKET BUILD AVAILABLE";tone="available";}
  else if(latest&&availableBuild){status="YOUR POCKET IS UP TO DATE";tone="current";}
  else if(!nativeReady()){status="ANDROID APP REQUIRED";tone="warning";}
  const statusNode=q("[data-update-status]");if(statusNode){statusNode.textContent=status;statusNode.dataset.tone=tone;}
  const notesNode=q("[data-update-notes]");
  if(notesNode){
    const notes=Array.isArray(latest?.notes)?latest.notes:[];
    const fallback=String(latest?.releaseNotes||"").split("\n").map(line=>line.replace(/^\s*[-*•]\s*/,"").trim()).filter(Boolean);
    const shown=(notes.length?notes:fallback).slice(0,8);
    notesNode.innerHTML=shown.length?shown.map(note=>"<li>"+escapeHtml(String(note))+"</li>").join("")
      :"<li>Release notes will appear here when a new Pocket build is published.</li>";
  }
  const total=Number(storage.totalBytes)||0,available=Number(storage.availableBytes)||0;
  const freePercent=Math.max(0,Math.min(100,Number(storage.freePercent)||(total>0?Math.round(available*100/total):0)));
  const storageFill=q("[data-update-storage-fill]");if(storageFill)storageFill.style.width=freePercent+"%";
  const storageBar=q("[data-update-storage-bar]");if(storageBar)storageBar.setAttribute("aria-valuenow",String(freePercent));
  set("[data-update-storage-value]",total>0?freePercent+"% FREE":"UNAVAILABLE");
  set("[data-update-storage-meta]",total>0?formatPocketBytes(available)+" free of "+formatPocketBytes(total)+" internal storage":"Internal storage information is unavailable on this device.");
  const folderSelected=storage.updateFolderSelected===true;
  const folderPath=String(storage.updateDownloadPath||"Choose a folder for Pocket updates");
  set("[data-update-storage-path]","UPDATE FOLDER · "+folderPath);
  const folderChoose=q("[data-update-folder-choose]");
  if(folderChoose)folderChoose.textContent=folderSelected?"CHANGE FOLDER":"CHOOSE FOLDER";

  const expectedDownloadBuild=latest?.buildNumber>0?(hasUpdate?availableBuild:currentBuild):0;
  let state=downloadState;
  if(!state){
    try{state=JSON.parse(native?.getPocketUpdateDownloadState?.(expectedDownloadBuild)||"{}");}
    catch{state={};}
  }
  const stateBuild=Number(state?.buildNumber)||0;
  if(expectedDownloadBuild>0&&stateBuild>0&&stateBuild!==expectedDownloadBuild){
    state={status:"idle",buildNumber:expectedDownloadBuild,progress:0,bytesDownloaded:0,totalBytes:0};
  }
  const running=["queued","downloading","paused","copying"].includes(state.status),completed=state.status==="completed";
  const area=q("[data-update-download-area]");if(area)area.hidden=!hasUpdate||(!running&&!completed&&!state.message);
  const fill=q("[data-update-progress-fill]");if(fill)fill.style.width=(Number(state.progress)||0)+"%";
  set("[data-update-progress-value]",(Number(state.progress)||0)+"%");
  set("[data-update-progress-meta]",completed?"DOWNLOAD COMPLETE · VERIFIED APK SAVED IN YOUR FOLDER":
    state.status==="copying"?"VERIFYING APK · SAVING TO YOUR SELECTED FOLDER…":
    running?formatPocketBytes(state.bytesDownloaded)+(state.totalBytes>0?" / "+formatPocketBytes(state.totalBytes):"")+" · "+state.status.toUpperCase():(state.message||""));
  const download=q("[data-update-download]");
  const busy=["queued","downloading","paused","copying"].includes(state.status);
  if(download){
    download.hidden=!hasUpdate||completed;
    download.disabled=!hasUpdate||busy||state.status==="folder_unavailable"||!latest?.apkUrl;
    download.textContent=state.status==="save_failed"?"RETRY SAVE":
      state.status==="missing"?"DOWNLOAD AGAIN":
      state.status==="folder_unavailable"?"CHOOSE FOLDER FIRST":
      busy?"DOWNLOADING…":"DOWNLOAD UPDATE";
  }
  const install=q("[data-update-install]");if(install){install.hidden=!completed||!hasUpdate;install.disabled=!completed||!hasUpdate;}
  const removeFile=q("[data-update-file-remove]");
  if(removeFile){
    const hasManagedFile=["completed","queued","downloading","paused","copying","save_failed","failed"].includes(state.status);
    removeFile.hidden=!hasManagedFile;
    removeFile.textContent=busy?"CANCEL / REMOVE":"REMOVE APK";
  }
  const folderOpen=q("[data-update-folder-open]");if(folderOpen)folderOpen.hidden=!folderSelected;
  const check=q("[data-update-check]");if(check){check.disabled=pocketUpdateCheckBusy;check.textContent=pocketUpdateCheckBusy?"CHECKING…":"CHECK AGAIN";}
}
function mountPocketUpdateSettings() {
  const panel=root.querySelector("[data-update-section]");if(!panel)return()=>{};
  const checkButton=panel.querySelector("[data-update-check]"),downloadButton=panel.querySelector("[data-update-download]"),installButton=panel.querySelector("[data-update-install]");
  const chooseFolderButton=panel.querySelector("[data-update-folder-choose]"),openFolderButton=panel.querySelector("[data-update-folder-open]"),removeFileButton=panel.querySelector("[data-update-file-remove]");
  let disposed=false,pollTimer=null;
  const refresh=()=>{
    if(disposed)return;
    const expectedBuild=Number(latestPocketUpdate?.buildNumber)||0;
    let state={};try{state=JSON.parse(native?.getPocketUpdateDownloadState?.(expectedBuild)||"{}");}catch{}
    refreshPocketUpdatePanel(state);
    const watched=["queued","downloading","paused","copying","completed"];
    if(watched.includes(state.status)){
      if(pollTimer===null)pollTimer=window.setInterval(()=>{
        if(disposed)return;
        const expectedBuild=Number(latestPocketUpdate?.buildNumber)||0;
        let next={};try{next=JSON.parse(native?.getPocketUpdateDownloadState?.(expectedBuild)||"{}");}catch{}
        refreshPocketUpdatePanel(next);
        if(!watched.includes(next.status)&&pollTimer!==null){window.clearInterval(pollTimer);pollTimer=null;}
      },state.status==="completed"?1800:850);
    }else if(pollTimer!==null){window.clearInterval(pollTimer);pollTimer=null;}
  };
  const check=async()=>{if(checkButton){checkButton.disabled=true;checkButton.textContent="CHECKING…";}await checkPocketUpdates(false);refresh();};
  const download=()=>{
    const update=latestPocketUpdate;
    if(!update?.hasUpdate||!update.apkUrl||!update.apkSha256||!update.apkName){
      refreshPocketUpdatePanel();
      return;
    }
    if(downloadButton){downloadButton.disabled=true;downloadButton.textContent="STARTING DOWNLOAD…";}
    let result={};
    try{
      if(typeof native?.startPocketUpdateDownload!=="function")throw new Error("The Android download service is unavailable. Reopen Pocket and try again.");
      result=JSON.parse(native.startPocketUpdateDownload(
        update.apkUrl,update.apkName,update.apkSha256,Number(update.buildNumber)||0
      )||"{}");
    }catch(error){
      result={ok:false,message:error instanceof Error?error.message:"Pocket could not start the download. Check available storage."};
    }
    if(!result.ok){
      if(downloadButton){downloadButton.disabled=false;downloadButton.textContent="RETRY DOWNLOAD";}
      const status=panel.querySelector("[data-update-status]");
      if(status){status.textContent=result.message||"DOWNLOAD COULD NOT START";status.dataset.tone="warning";}
    }
    refresh();
  };
  const install=()=>{
    let result={};try{result=JSON.parse(native.installDownloadedPocketUpdate()||"{}");}
    catch{result={ok:false,message:"Android could not open the Pocket installer."};}
    const status=panel.querySelector("[data-update-status]");
    if(status){status.textContent=result.message||(result.ok?"OPENING ANDROID INSTALLER":"INSTALLATION NEEDS ATTENTION");status.dataset.tone=result.ok?"available":"warning";}
  };
  const chooseFolder=()=>{
    if(typeof native?.choosePocketUpdateFolder!=="function")return;
    if(chooseFolderButton){chooseFolderButton.disabled=true;chooseFolderButton.textContent="OPENING FOLDER PICKER…";}
    const started=native.choosePocketUpdateFolder()===true;
    if(!started&&chooseFolderButton){chooseFolderButton.disabled=false;chooseFolderButton.textContent="CHOOSE FOLDER";}
  };
  const openFolder=()=>{
    const opened=native?.openPocketUpdateFolder?.()===true;
    if(!opened){
      const status=panel.querySelector("[data-update-status]");
      if(status){status.textContent="NO COMPATIBLE FILE MANAGER COULD OPEN THIS FOLDER";status.dataset.tone="warning";}
    }
  };
  const removeFile=()=>{native?.confirmRemovePocketUpdateApk?.();};
  const onFolderChanged=event=>{
    if(chooseFolderButton){chooseFolderButton.disabled=false;chooseFolderButton.textContent="CHANGE FOLDER";}
    if(event.detail?.message&&!event.detail?.ok&&!event.detail?.cancelled){
      const status=panel.querySelector("[data-update-status]");
      if(status){status.textContent=String(event.detail.message);status.dataset.tone="warning";}
    }
    refresh();
  };
  const onFileChanged=()=>refresh();
  checkButton?.addEventListener("click",check);downloadButton?.addEventListener("click",download);installButton?.addEventListener("click",install);
  chooseFolderButton?.addEventListener("click",chooseFolder);openFolderButton?.addEventListener("click",openFolder);removeFileButton?.addEventListener("click",removeFile);
  window.addEventListener("pocket:update-folder-changed",onFolderChanged);
  window.addEventListener("pocket:update-file-changed",onFileChanged);
  refresh();if(!latestPocketUpdate&&nativeReady())void checkPocketUpdates(false);
  return()=>{
    disposed=true;
    checkButton?.removeEventListener("click",check);downloadButton?.removeEventListener("click",download);installButton?.removeEventListener("click",install);
    chooseFolderButton?.removeEventListener("click",chooseFolder);openFolderButton?.removeEventListener("click",openFolder);removeFileButton?.removeEventListener("click",removeFile);
    window.removeEventListener("pocket:update-folder-changed",onFolderChanged);window.removeEventListener("pocket:update-file-changed",onFileChanged);
    if(pollTimer!==null)window.clearInterval(pollTimer);
  };
}

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

function readPaperGlow() {
  try {
    const stored=localStorage.getItem("mp-paper-glow");
    if(stored===null)return 78;
    const value=Number(stored);
    return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):78;
  } catch { return 78; }
}
function applyPaperGlow() {
  const value=Math.max(0,Math.min(100,Number(paperGlow)||0));
  document.documentElement.style.setProperty("--paper-glow-intensity",(value/100).toFixed(2));
  const slider=root.querySelector("[data-paper-glow]");
  const output=root.querySelector("[data-paper-glow-value]");
  const knob=root.querySelector("[data-paper-arc-knob]");
  if(slider){slider.value=String(value);slider.style.setProperty("--glow-level",value+"%");}
  if(output)output.textContent=value+"%";
  if(knob){
    const t=value/100;
    let y;
    const q=2*t-1;
    y=49-20*Math.pow(1-q*q,2);
    knob.style.left=(9+82*t)+"%";
    knob.style.top=y+"px";
  }
}

function vinylLabelContents(style) {
  const text = value => escapeHtml(value ?? "").replace(/\n/g, "<br>");
  return `
    <span class="label-micro">${text(style.micro)}</span>
    ${style.mark ? `<b class="label-mark">${text(style.mark)}</b>` : ""}
    <b class="label-word">${text(style.word)}</b>
    <span class="label-side">${text(style.side)}</span>
    <small class="label-info">${text(style.info)}</small>
    <i class="label-hole" aria-hidden="true"></i>`;
}

function vinylStyleOptionMarkup(style) {
  return `
    <button type="button" class="vinyl-style-option" data-vinyl-style="${style.id}" aria-pressed="false">
      <span class="style-record-preview"><span class="style-record-grooves">
        <span class="mini-label style-${style.id}">${vinylLabelContents(style)}</span>
      </span></span>
      <span class="style-option-copy"><b>${style.number}</b><span>${escapeHtml(style.name)}</span></span>
      <span class="style-option-check" aria-hidden="true">✓</span>
    </button>`;
}

function audioRecordMarkup(track, index) {
  const custom = track.custom === true;
  return `
    <div class="audio-record-row">
      <button type="button" class="audio-record${custom ? " is-custom-record" : ""}" data-audio-record="${escapeHtml(track.id)}" aria-pressed="false">
        <span class="record-sleeve"><i class="sleeve-vinyl"></i><b>${String(index + 1).padStart(2,"0")}</b></span>
        <span class="record-copy"><strong>${escapeHtml(track.title)}</strong><small>${custom ? "YOUR RECORD · " + escapeHtml((track.extension || "AUDIO").toUpperCase()) : track.official ? "MERZKAVA OFFICIAL · ADX" : "POCKET ORIGINAL · ADX"}</small></span>
        <span class="record-state" aria-hidden="true">✓</span>
      </button>
      ${custom
        ? `<button type="button" class="audio-record-remove" data-audio-remove="${escapeHtml(track.nativeId || track.id)}" aria-label="Remove ${escapeHtml(track.title)}" title="Remove imported music">×</button>`
        : `<span class="audio-record-locked" aria-label="Built-in music cannot be removed" title="Pocket original">◆</span>`}
    </div>`;
}

function renderAudioRecordList() {
  const list = root.querySelector("[data-audio-record-list]");
  if (!list) return;
  const tracks = audioDirector.getTracks();
  const signature = tracks.map(track => track.id + ":" + track.title).join("|");
  if (list.dataset.renderSignature !== signature) {
    list.innerHTML = tracks.map(audioRecordMarkup).join("");
    list.dataset.renderSignature = signature;
  }
}

function showAudioImportNotice(message, success = false) {
  const overlay = root.querySelector("[data-audio-import-overlay]");
  if (!overlay) return;
  const title = overlay.querySelector("[data-audio-import-title]");
  const kicker = overlay.querySelector("[data-audio-import-kicker]");
  const copy = overlay.querySelector("[data-audio-import-message]");
  if (title) title.textContent = success
    ? (overlay.dataset.noticeAction === "removed" ? "Record removed" : "A new record is ready")
    : (overlay.dataset.noticeAction === "remove-failed" ? "Could not remove record" : "This file is not supported");
  if (kicker) kicker.textContent = success
    ? (overlay.dataset.noticeAction === "removed" ? "REMOVED FROM YOUR RACK" : "ADDED TO YOUR RECORD RACK")
    : (overlay.dataset.noticeAction === "remove-failed" ? "RECORD RACK · NOT CHANGED" : "RECORD RACK · FILE CHECK");
  if (copy) copy.textContent = String(message || (success ? "Your music has joined the library." : "Choose an audio file Pocket can prepare for the record deck."));
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden","false");
  const panel = overlay.querySelector(".audio-import-card");
  if (panel && !reducedMotion()) animate(panel,{opacity:[0,1],translateY:[12,0],scale:[.98,1],duration:300,ease:"outCubic"});
  overlay.querySelector("[data-audio-import-close]")?.focus();
}

window.addEventListener("pocket:music-library-changed", event => {
  const result = event.detail || {};
  if (Array.isArray(result.tracks)) audioDirector.updateCustomTracks(result.tracks);
  syncAudioUI();
  if (!result.cancelled && result.message) {
    const overlay = root.querySelector("[data-audio-import-overlay]");
    if (overlay) overlay.dataset.noticeAction = result.action || "";
    showAudioImportNotice(result.message, result.ok === true);
  }
});

function syncAudioUI() {
  const player = root.querySelector("[data-audio-player]");
  if (!player) return;
  const state = audioDirector.getState();
  const labelState = vinylDesigns.getState();
  renderAudioRecordList();
  const deckLocked = state.isLoading || state.status === "idle" || state.status === "error";
  activeTurntableMotion?.setPlaying(state.motorRunning && !reducedMotion(), { hardStop:deckLocked });
  if (deckLocked) cancelActiveRecordFlight();
  if (state.status === "playing" && state.isPlaying && pendingRecordPlacement === state.track) {
    const readyTrack = pendingRecordPlacement;
    const recordButton = [...root.querySelectorAll("[data-audio-record]")]
      .find(button => button.dataset.audioRecord === readyTrack);
    if (recordButton) {
      pendingRecordPlacement = "";
      animateRecordToPlatter(recordButton, () => {
        const current = audioDirector.getState();
        if (current.track === readyTrack && current.status === "playing" &&
            current.isPlaying && !current.pausePending) audioDirector.playEffect("record-placement");
      });
    }
  }
  player.classList.toggle("is-needle-down", state.needleDown);
  player.classList.toggle("is-playing", state.isPlaying);
  player.classList.toggle("is-starting", state.isStarting);
  player.classList.toggle("is-loading", state.isLoading);
  player.classList.toggle("is-paused", state.isPaused);
  const trackTitle = player.querySelector("[data-track-title]");
  const status = player.querySelector("[data-audio-status]");
  const needle = player.querySelector("[data-audio-needle]");
  const currentLabel = player.querySelector("[data-vinyl-label]");
  if (trackTitle) trackTitle.textContent = state.title;
  if (status) {
    status.textContent = state.error || state.ambienceStatus === "error"
      ? "CRI AUDIO · NEEDS ATTENTION"
      : state.isLoading
        ? "LOADING SELECTED RECORD · DECK LOCKED"
        : state.startupSequence === "record-placement"
          ? "AUDIO READY · RECORD PLACEMENT"
          : state.isPlaying && !state.needleDown
            ? "MOTOR SPIN-UP · STYLUS RAISED"
            : state.isPlaying
              ? "PLAYING · CRI AUDIO"
              : state.isPaused
                ? "PAUSED · NEEDLE LIFTED"
                : "NEEDLE LIFTED · READY";
    status.setAttribute("aria-busy", String(state.isLoading));
  }
  if (needle) {
    needle.setAttribute("aria-label", state.needleDown ? "Lift the stylus and pause music" : state.isPlaying ? "Stop the motor before stylus contact" : state.isStarting ? "Cancel pending playback" : "Lower the stylus and play music");
    needle.setAttribute("aria-pressed", String(state.isPlaying || state.isStarting || state.isPaused));
    needle.classList.toggle("is-paused", state.isPaused);
  }
  if (currentLabel) {
    currentLabel.className = "vinyl-label style-" + labelState.id;
    currentLabel.innerHTML = vinylLabelContents(labelState.style);
    currentLabel.setAttribute("aria-label", labelState.style.name + " center label");
  }
  root.querySelectorAll("[data-audio-record]").forEach(button => {
    const selected = button.dataset.audioRecord === state.track;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  root.querySelectorAll("[data-vinyl-style]").forEach(button => {
    const selected = button.dataset.vinylStyle === labelState.id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const styleMode = root.querySelector("[data-vinyl-style-mode]");
  if (styleMode) styleMode.textContent = labelState.mode === "manual" ? "MANUAL PICK · NEXT CYCLE RETURNS TO AUTO" : "AUTO · CHANGES EACH TRACK / SEASON";
  const autoButton = root.querySelector("[data-vinyl-auto]");
  if (autoButton) {
    autoButton.classList.toggle("is-selected", labelState.mode === "auto");
    autoButton.setAttribute("aria-pressed", String(labelState.mode === "auto"));
  }
  const musicSlider = root.querySelector("[data-music-volume]");
  const musicOutput = root.querySelector("[data-music-volume-value]");
  const ambienceSlider = root.querySelector("[data-ambience-volume]");
  const ambienceOutput = root.querySelector("[data-ambience-volume-value]");
  const effectsSlider = root.querySelector("[data-effects-volume]");
  const effectsOutput = root.querySelector("[data-effects-volume-value]");
  if (musicSlider) musicSlider.value = String(state.musicVolume);
  if (musicOutput) musicOutput.textContent = state.musicVolume + "%";
  if (ambienceSlider) ambienceSlider.value = String(state.ambienceVolume);
  if (ambienceOutput) ambienceOutput.textContent = state.ambienceVolume + "%";
  if (effectsSlider) effectsSlider.value = String(state.effectsVolume);
  if (effectsOutput) effectsOutput.textContent = state.effectsVolume + "%";
}

function cancelActiveRecordFlight() {
  if (!activeRecordFlight) return;
  activeRecordFlight.animation.pause();
  activeRecordFlight.element.remove();
  activeRecordFlight = null;
}

function animateRecordToPlatter(button, onLanded = () => {}) {
  cancelActiveRecordFlight();
  const readyState = audioDirector.getState();
  if (!readyState.isPlaying || readyState.status !== "playing" || readyState.pausePending) return false;
  const expectedTrack = button?.dataset?.audioRecord || readyState.track;
  const stillCurrent = () => {
    const current = audioDirector.getState();
    return current.track === expectedTrack && current.status === "playing" &&
      current.isPlaying && !current.pausePending;
  };
  const sleeve = button?.querySelector(".record-sleeve");
  const platter = root.querySelector(".turntable-platter");
  if (!sleeve || !platter || reducedMotion()) {
    if (stillCurrent()) onLanded();
    return true;
  }
  const from = sleeve.getBoundingClientRect();
  const to = platter.getBoundingClientRect();
  if (!from.width || !from.height || !to.width || !to.height) {
    if (stillCurrent()) onLanded();
    return true;
  }
  const diameter = Math.min(to.width * 0.82, to.height * 0.82);
  const flight = document.createElement("span");
  flight.className = "audio-record-flight";
  flight.setAttribute("aria-hidden", "true");
  Object.assign(flight.style, {
    left:(from.left+(from.width-diameter)/2)+"px",
    top:(from.top+(from.height-diameter)/2)+"px",
    width:diameter+"px",height:diameter+"px",opacity:"0.98"
  });
  document.body.append(flight);
  const animation = animate(flight, {
    left:(to.left+(to.width-diameter)/2)+"px",
    top:(to.top+(to.height-diameter)/2)+"px",
    rotate:["0deg","270deg"],
    translateY:[0,-7,0],scale:[0.94,1,0.98],opacity:[0.98,0.92],
    duration:760,ease:"inOutCubic",
    onComplete:() => {
      flight.remove();
      if (activeRecordFlight?.element === flight) activeRecordFlight = null;
      if (stillCurrent()) onLanded();
    }
  });
  activeRecordFlight = {element:flight,animation};
  return true;
}

function mountAudioSettings() {
  const section = root.querySelector("[data-audio-section]");
  if (!section) return () => {};
  const disc = section.querySelector(".vinyl-disc");
  const turntableMotion = createTurntableMotion({
    onFrame: angle => { disc.style.transform = "rotate(" + angle.toFixed(3) + "deg)"; }
  });
  activeTurntableMotion = turntableMotion;
  turntableMotion.setRenderEnabled(!bubbleVisualSuspended);
  const toggle = section.querySelector("[data-audio-toggle]");
  const content = section.querySelector("[data-audio-content]");
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    section.classList.toggle("is-expanded", expanded);
    content.hidden = !expanded;
    if (expanded) {
      syncAudioUI();
      if (!reducedMotion()) animate(content, { opacity:[0,1], translateY:[8,0], duration:340, ease:"outCubic" });
    }
  });
  toggle.setAttribute("aria-expanded", "false");
  section.classList.remove("is-expanded");

  const drawer = section.querySelector("[data-vinyl-drawer]");
  const drawerToggle = drawer?.querySelector("[data-vinyl-drawer-toggle]");
  const drawerPanel = drawer?.querySelector("[data-vinyl-drawer-panel]");
  const drawerGrip = drawer?.querySelector("[data-vinyl-drawer-grip]");
  let drawerOpen = false;
  let drawerPointer = null;
  let drawerStartY = 0;
  let drawerDeltaY = 0;
  let drawerDragged = false;
  const setDrawerOpen = next => {
    if (!drawerPanel || drawerOpen === next) return;
    drawerOpen = next;
    drawerToggle?.setAttribute("aria-expanded", String(next));
    drawer?.classList.toggle("is-open", next);
    if (next) {
      drawerPanel.hidden = false;
      drawerPanel.style.removeProperty("transform");
      drawerPanel.style.removeProperty("opacity");
      if (!reducedMotion()) animate(drawerPanel, { opacity:[0,1], translateY:[20,0], duration:290, ease:"outCubic" });
    } else if (reducedMotion()) {
      drawerPanel.hidden = true;
      drawerPanel.style.removeProperty("transform");
      drawerPanel.style.removeProperty("opacity");
    } else {
      animate(drawerPanel, {
        opacity:[1,0], translateY:[0,26], duration:220, ease:"inCubic",
        onComplete:() => {
          if (!drawerOpen) drawerPanel.hidden = true;
          drawerPanel.style.removeProperty("transform");
          drawerPanel.style.removeProperty("opacity");
        }
      });
    }
  };
  drawerToggle?.addEventListener("click", () => setDrawerOpen(!drawerOpen));
  const gripDown = event => {
    if (!drawerOpen || drawerPointer !== null || event.button !== 0) return;
    drawerPointer = event.pointerId;
    drawerStartY = event.clientY;
    drawerDeltaY = 0;
    drawerDragged = false;
    drawerGrip.setPointerCapture?.(event.pointerId);
    drawerPanel.classList.add("is-dragging");
  };
  const gripMove = event => {
    if (drawerPointer !== event.pointerId) return;
    drawerDeltaY = Math.max(0, event.clientY - drawerStartY);
    if (drawerDeltaY > 4) drawerDragged = true;
    drawerPanel.style.transform = "translateY(" + Math.min(150, drawerDeltaY) + "px)";
    drawerPanel.style.opacity = String(Math.max(.42, 1 - drawerDeltaY / 190));
  };
  const gripUp = event => {
    if (drawerPointer !== event.pointerId) return;
    drawerGrip.releasePointerCapture?.(event.pointerId);
    drawerPointer = null;
    drawerPanel.classList.remove("is-dragging");
    const close = drawerDeltaY > 48 || !drawerDragged;
    drawerDeltaY = 0;
    if (close) setDrawerOpen(false);
    else {
      drawerPanel.style.removeProperty("transform");
      drawerPanel.style.removeProperty("opacity");
    }
  };
  if (drawerGrip) {
    drawerGrip.addEventListener("pointerdown", gripDown);
    drawerGrip.addEventListener("pointermove", gripMove);
    drawerGrip.addEventListener("pointerup", gripUp);
    drawerGrip.addEventListener("pointercancel", gripUp);
    drawerGrip.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setDrawerOpen(false);
      }
    });
  }
  drawer?.querySelectorAll("[data-vinyl-style]").forEach(button => {
    button.addEventListener("click", () => vinylDesigns.choose(button.dataset.vinylStyle));
  });
  drawer?.querySelector("[data-vinyl-auto]")?.addEventListener("click", () => vinylDesigns.returnToAuto());

  const recordList = section.querySelector("[data-audio-record-list]");
  const editListButton = section.querySelector("[data-audio-edit-list]");
  let editListMode = false;
  let pendingRemoveId = "";
  const setEditListMode = enabled => {
    editListMode = !!enabled;
    recordList?.classList.toggle("is-editing",editListMode);
    editListButton?.setAttribute("aria-pressed",String(editListMode));
    if (editListButton) editListButton.textContent = editListMode ? "DONE" : "EDIT RACK";
  };
  editListButton?.addEventListener("click",() => setEditListMode(!editListMode));

  const importOverlay = section.querySelector("[data-audio-import-overlay]");
  const hideImportOverlay = () => {
    importOverlay.hidden = true;
    importOverlay.setAttribute("aria-hidden","true");
    importOverlay.dataset.noticeAction = "";
    pendingRemoveId = "";
    importOverlay.querySelector("[data-audio-import-confirm]").hidden = true;
    importOverlay.querySelector("[data-audio-import-close]").textContent = "RETURN TO AUDIO";
  };
  recordList?.addEventListener("click", event => {
    const removeButton = event.target?.closest?.("[data-audio-remove]");
    if (removeButton && recordList.contains(removeButton)) {
      const id = removeButton.dataset.audioRemove || "";
      const track = audioDirector.getTracks().find(item => (item.nativeId || item.id) === id && item.custom);
      if (!track || !editListMode) return;
      pendingRemoveId = id;
      importOverlay.dataset.noticeAction = "confirm-remove";
      importOverlay.querySelector("[data-audio-import-kicker]").textContent = "EDIT RECORD RACK";
      importOverlay.querySelector("[data-audio-import-title]").textContent = "Remove this record?";
      importOverlay.querySelector("[data-audio-import-message]").textContent =
        track.title + " will be removed from Pocket's private music shelf. Original Pocket music is never removed.";
      importOverlay.querySelector("[data-audio-import-confirm]").hidden = false;
      importOverlay.querySelector("[data-audio-import-close]").textContent = "KEEP RECORD";
      importOverlay.hidden = false;
      importOverlay.setAttribute("aria-hidden","false");
      if (!reducedMotion()) animate(importOverlay.querySelector(".audio-import-card"),{opacity:[0,1],translateY:[12,0],duration:260,ease:"outCubic"});
      importOverlay.querySelector("[data-audio-import-confirm]").focus();
      return;
    }
    const button = event.target?.closest?.("[data-audio-record]");
    if (!button || !recordList.contains(button) || editListMode) return;
    const trackId = button.dataset.audioRecord;
    const changed = audioDirector.selectTrack(trackId);
    if (!changed) return;
    pendingRecordPlacement = trackId;
    if (vinylDesigns.getState().mode === "auto") vinylDesigns.rotateRandom("track-change");
    // Keep the sleeve parked until the selected CRI stream reports PLAYING.
    syncAudioUI();
  });
  importOverlay?.querySelector("[data-audio-import-close]")?.addEventListener("click",hideImportOverlay);
  importOverlay?.querySelector("[data-audio-import-confirm]")?.addEventListener("click",() => {
    if (!pendingRemoveId || typeof native?.deleteCustomMusicTrack !== "function") {
      hideImportOverlay();
      const overlay = section.querySelector("[data-audio-import-overlay]");
      overlay.dataset.noticeAction = "remove-failed";
      showAudioImportNotice("Pocket could not remove this imported record.",false);
      return;
    }
    let result;
    try { result = JSON.parse(native.deleteCustomMusicTrack(pendingRemoveId) || "{}"); }
    catch { result = {ok:false,message:"Pocket could not remove this record."}; }
    if (Array.isArray(result.tracks)) audioDirector.updateCustomTracks(result.tracks);
    hideImportOverlay();
    if (result.ok) setEditListMode(false);
    const overlay = section.querySelector("[data-audio-import-overlay]");
    overlay.dataset.noticeAction = result.ok ? "removed" : "remove-failed";
    showAudioImportNotice(result.message || "Pocket could not remove this record.",result.ok === true);
  });
  importOverlay?.addEventListener("click",event => {
    if (event.target === importOverlay) hideImportOverlay();
  });
  section.querySelector("[data-audio-add]")?.addEventListener("click", () => {
    if (typeof native?.openPocketAudioPicker !== "function" ||
        native.openPocketAudioPicker() !== true) {
      showAudioImportNotice("Pocket could not open the device file manager. Please try again.", false);
    }
  });

  section.querySelector("[data-audio-needle]").addEventListener("click", () => {
    void audioDirector.toggleNeedle();
  });
  section.querySelector("[data-music-volume]").addEventListener("input", event => {
    audioDirector.setMusicVolume(event.currentTarget.value);
  });
  section.querySelector("[data-ambience-volume]").addEventListener("input", event => {
    audioDirector.setAmbienceVolume(event.currentTarget.value);
  });
  section.querySelector("[data-effects-volume]").addEventListener("input", event => {
    audioDirector.setEffectsVolume(event.currentTarget.value);
  });
  syncAudioUI();
  return () => {
    turntableMotion.dispose();
    if (activeTurntableMotion === turntableMotion) activeTurntableMotion = null;
    cancelActiveRecordFlight();
  };
}

function paperLightControlMarkup() {
  return `
    <section class="visual-setting paper-light-setting">
      <div class="paper-light-heading"><strong>Paper Light</strong><small>A soft, breathing glow rising from the paper behind your navigation dock.</small></div>
      <div class="paper-light-control stellar-paper-control">
        <div class="paper-light-head"><label for="paper-light-intensity">LIGHT INTENSITY</label><output data-paper-glow-value>${paperGlow}%</output></div>
        <div class="paper-stellar-arc" data-paper-arc>
          <div class="paper-arc-glow"></div>
          <div class="paper-arc-tail paper-arc-tail-left"></div>
          <div class="paper-arc-curve"></div>
          <div class="paper-arc-tail paper-arc-tail-right"></div>
          <div class="paper-starfield" aria-hidden="true">
            <i style="left:4%;top:41px;font-size:3px;opacity:.35">✦</i><i style="left:16%;top:9px;font-size:2px;opacity:.7">✧</i><i style="left:24%;top:67px;font-size:2px;opacity:.25">·</i><i style="left:31%;top:25px;font-size:3px;opacity:.9">✦</i><i style="left:39%;top:83px;font-size:2px;opacity:.45">·</i><i style="left:45%;top:5px;font-size:2px;opacity:.3">✧</i><i style="left:52%;top:52px;font-size:3px;opacity:.65">✦</i><i style="left:58%;top:17px;font-size:2px;opacity:.4">·</i><i style="left:76%;top:39px;font-size:2px;opacity:.8">✧</i><i style="left:83%;top:8px;font-size:3px;opacity:.35">✦</i><i style="left:93%;top:71px;font-size:2px;opacity:.6">·</i><i style="left:11%;top:91px;font-size:2px;opacity:.5">✧</i><i style="left:19%;top:47px;font-size:2px;opacity:.85">·</i><i style="left:36%;top:58px;font-size:2px;opacity:.3">✦</i><i style="left:48%;top:95px;font-size:2px;opacity:.7">·</i><i style="left:64%;top:75px;font-size:2px;opacity:.25">✧</i><i style="left:71%;top:3px;font-size:2px;opacity:.6">·</i><i style="left:88%;top:49px;font-size:2px;opacity:.4">✦</i><i style="left:6%;top:76px;font-size:2px;opacity:.75">·</i><i style="left:28%;top:101px;font-size:2px;opacity:.35">✧</i><i style="left:42%;top:36px;font-size:2px;opacity:.55">·</i><i style="left:61%;top:91px;font-size:2px;opacity:.8">✦</i><i style="left:79%;top:84px;font-size:2px;opacity:.3">·</i><i style="left:96%;top:19px;font-size:2px;opacity:.65">✧</i><i style="left:14%;top:61px;font-size:2px;opacity:.2">·</i><i style="left:55%;top:68px;font-size:2px;opacity:.5">✧</i><i style="left:69%;top:44px;font-size:2px;opacity:.3">·</i><i style="left:90%;top:96px;font-size:2px;opacity:.75">✦</i><i style="left:34%;top:12px;font-size:2px;opacity:.4">·</i><i style="left:73%;top:99px;font-size:2px;opacity:.55">✧</i><i style="left:3%;top:15px;font-size:2px;opacity:.25">·</i><i style="left:47%;top:77px;font-size:2px;opacity:.9">·</i><i style="left:85%;top:28px;font-size:2px;opacity:.45">✧</i>
          </div>
          <span class="paper-arc-knob" data-paper-arc-knob aria-hidden="true"><i class="paper-arc-moon"></i><i class="paper-arc-sun"></i></span>
          <input id="paper-light-intensity" class="paper-arc-input" data-paper-glow type="range" min="0" max="100" step="1" value="${paperGlow}" aria-label="Paper light intensity">
        </div>
        <div class="paper-light-scale"><span>DIM</span><span>BRIGHT</span></div>
      </div>
    </section>`;
}
function setPaperGlow(next) {
  const value=Number(next);
  if(!Number.isFinite(value))return;
  paperGlow=Math.max(0,Math.min(100,Math.round(value)));
  try{localStorage.setItem("mp-paper-glow",String(paperGlow));}catch{}
  applyPaperGlow();
}


function nativeReady() {
  try { return !!native && native.isNative() === true; } catch { return false; }
}
function readNativeFloatingState() {
  const empty={displayOverApps:false,notifications:false,batteryExemption:false,serviceRunning:false,bubbleVisible:false,supported:false};
  if(!nativeReady()||typeof native.getReadiness!=="function")return empty;
  try{const state=JSON.parse(native.getReadiness()||"{}");return {...empty,...state,bubbleVisible:state.bubbleVisible===true,supported:state.supported===true};}
  catch{return empty;}
}
async function waitForNativeFloatingState(predicate,timeout=2200){
  const deadline=Date.now()+timeout;
  do{const state=readNativeFloatingState();floatingReadiness=state;if(predicate(state))return state;await wait(80);}while(Date.now()<=deadline);
  floatingReadiness=readNativeFloatingState();
  throw new Error("Android did not confirm the floating-bubble state. Check the overlay permission and try again.");
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
      // An update check is a read-only request with its own bounded timeout;
      // it must not be sent through the player-identity cancellation bridge.
      if (method !== "checkPocketUpdate") {
        try { native.cancelPlayerIdentity?.(id); } catch {}
      }
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

function cancellableWait(ms, signal) {
  if (signal?.aborted) return Promise.reject(new DOMException("Access cancelled.", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, Math.max(0, ms));
    const abort = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Access cancelled.", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once:true });
  });
}

function accessBufferMarkup(mode = "ACCESS ROUTINE") {
  return `
    <div class="access-buffer" data-access-buffer hidden aria-hidden="true">
      <div class="buffer-frame">
        <div class="buffer-top"><span>MERZKAVA POCKET</span><b>${mode}</b></div>
        <div class="buffer-instrument" aria-hidden="true">
          <div class="buffer-gear buffer-gear-outer"></div>
          <div class="buffer-gear buffer-gear-middle"></div>
          <div class="buffer-gear buffer-gear-small"><i></i></div>
          <div class="buffer-orbit"><i></i><b></b><span></span><em></em></div>
          <div class="buffer-escapement"><i></i><b></b><span></span></div>
          <div class="buffer-pendulum"><i></i><b></b></div>
          <div class="buffer-scan"></div>
          <div class="buffer-medallion"><span>M</span><i></i></div>
          <div class="buffer-sparks"><i></i><b></b><em></em><span></span></div>
          <div class="buffer-vapor" aria-hidden="true"><i></i><b></b><em></em><span></span></div>
        </div>
        <div class="buffer-copy">
          <span data-access-label>DIAGNOSTIC TRACE</span>
          <strong data-access-message aria-live="polite">server int</strong>
        </div>
        <div class="buffer-progress">
          <div class="buffer-progress-head"><span>TRACE INDEX</span><b data-access-number>00 / 40</b></div>
          <div class="buffer-track" aria-hidden="true"><i data-access-rail></i><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <small>DIAGNOSTIC TRACE · FINAL HANDSHAKE WAITS FOR THE REAL RESULT</small>
        </div>
        <button type="button" class="buffer-cancel" data-access-cancel>CANCEL ROUTINE</button>
      </div>
    </div>`;
}

async function runAccessSequence(role, operation, signal) {
  const overlay = root.querySelector("[data-access-buffer]");
  if (!overlay) throw new Error("The access transition surface is unavailable.");
  const rail = overlay.querySelector("[data-access-rail]");
  const track = rail?.parentElement;
  const number = overlay.querySelector("[data-access-number]");
  const message = overlay.querySelector("[data-access-message]");
  const label = overlay.querySelector("[data-access-label]");
  const animations = [];
  const reduced = reducedMotion();
  const trace = getAccessDiagnostics(role);
  const entries = trace.entries;
  if (!entries.length) throw new Error("The access diagnostic trace is empty.");

  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-active");
  track?.classList.remove("is-waiting");
  rail.style.transform = "scaleX(0)";
  label.textContent = trace.heading;
  number.textContent = "00 / " + String(entries.length).padStart(2,"0");

  const resultPromise = Promise.resolve().then(operation).then(
    value => ({ ok:true, value }),
    error => ({ ok:false, error })
  );
  const failFast = resultPromise.then(result => {
    if (result.ok) return new Promise(() => {});
    throw result.error;
  });
  let progress = 0;
  let activeGroup = "";
  let messageAnimation = null;
  let waitAnimation = null;

  const pause = ms => Promise.race([cancellableWait(ms,signal), failFast]);
  const bounded = (value,min,max) => Math.max(min,Math.min(max,value));
  const showFrame = (copy, group, dots = 0, entering = false) => {
    if (group !== activeGroup) {
      activeGroup = group;
      label.textContent = group;
    }
    message.textContent = formatDiagnosticFrame(copy,dots);
    if (!reduced && entering) {
      messageAnimation?.pause();
      messageAnimation = animate(message,{
        opacity:[.58,1],
        translateY:[4,0],
        duration:112,
        ease:"outCubic"
      });
    }
  };

  const runEntry = async (entry,index) => {
    if (signal?.aborted) throw new DOMException("Access cancelled.","AbortError");
    number.textContent = String(index+1).padStart(2,"0") + " / " + String(entries.length).padStart(2,"0");

    const wordFrames = getDiagnosticWordFrames(entry.text);
    const wordDelays = wordFrames.map(frame => reduced
      ? 8
      : Math.round(bounded(34 + frame.length * 3.2,46,112)));
    const dotBase = reduced
      ? 8
      : Math.round(bounded(70 + entry.text.length * 2.5,88,164));
    const dotDelays = [dotBase,Math.round(dotBase*1.18),Math.round(dotBase*1.48)];
    const cycles = Math.max(0,Math.min(4,Math.trunc(entry.cycles || 0)));
    const totalDuration = Math.max(16,
      wordDelays.reduce((sum,value)=>sum+value,0) +
      cycles * dotDelays.reduce((sum,value)=>sum+value,0)
    );
    const target = Math.min(93,Math.round(((index+1)/entries.length)*93));

    // The rail moves continuously while text fragments are revealed. Longer dotted holds
    // naturally slow this segment; short fragments move it on more quickly.
    if (reduced) {
      rail.style.transform = "scaleX(" + target/100 + ")";
    } else {
      animations.push(animate(rail,{
        scaleX:[progress/100,target/100],
        duration:totalDuration,
        ease:"linear"
      }));
    }

    for (let wordIndex=0;wordIndex<wordFrames.length;wordIndex++) {
      showFrame(wordFrames[wordIndex],entry.group,0,true);
      await pause(wordDelays[wordIndex]);
    }
    for (let cycle=0;cycle<cycles;cycle++) {
      for (let dot=1;dot<=3;dot++) {
        showFrame(entry.text,entry.group,dot,dot===1);
        await pause(dotDelays[dot-1]);
      }
    }
    progress=target;
  };

  try {
    for (let index=0;index<entries.length;index++) {
      await runEntry(entries[index],index);
    }

    let result = null;
    const pendingEntries = entries.filter(entry => entry.cycles > 0);
    let pendingIndex = 0;
    let pendingDots = 1;
    track?.classList.add("is-waiting");
    if (!reduced) {
      waitAnimation = animate(rail,{
        scaleX:[progress/100,.965],
        duration:940,
        ease:"inOutSine",
        alternate:true,
        loop:true
      });
    }
    // The real operation may still be pending after the visual trace. Keep showing
    // delayed diagnostic fragments while the rail gently breathes below completion.
    while (!result) {
      const entry = pendingEntries[pendingIndex % pendingEntries.length] || entries[entries.length-1];
      showFrame(entry.text,entry.group,pendingDots,pendingDots===1);
      result = await Promise.race([
        resultPromise,
        cancellableWait(reduced ? 72 : bounded(118 + entry.text.length*2.1,132,188),signal).then(()=>null)
      ]);
      if (pendingDots === 3) {
        pendingDots=1;
        pendingIndex++;
      } else {
        pendingDots++;
      }
    }
    waitAnimation?.pause();
    waitAnimation=null;
    track?.classList.remove("is-waiting");

    if (!result.ok) throw result.error;
    if (signal?.aborted) throw new DOMException("Access cancelled.","AbortError");

    number.textContent = "READY";
    label.textContent = role === "transition" ? "SESSION READY" : "ACCESS VERIFIED";
    message.textContent = role === "transition" ? "Pocket is ready." : "Identity verified.";
    if (reduced) rail.style.transform = "scaleX(1)";
    else animations.push(animate(rail,{scaleX:[progress/100,1],duration:260,ease:"outCubic"}));
    await cancellableWait(reduced ? 0 : 260,signal);
    return result.value;
  } finally {
    waitAnimation?.pause();
    messageAnimation?.pause();
    animations.forEach(animation => animation.pause());
    track?.classList.remove("is-waiting");
    overlay.classList.remove("is-active");
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden","true");
    rail.style.transform = "scaleX(0)";
  }
}
function playStartupSplash() {
  disposeCurrent();
  currentRoute = "splash";
  root.innerHTML = `
    <main class="startup-splash" aria-label="Merzkava Pocket starting">
      <img class="startup-splash-bird" src="/merzkava-pocket-shimaenaga.svg" alt="Merzkava Pocket shimaenaga bird" fetchpriority="high">
    </main>`;
  const stage = root.querySelector(".startup-splash");
  const bird = root.querySelector(".startup-splash-bird");
  let cancelled = false;
  const animations = [];

  const finish = () => {
    if (cancelled) return;
    currentDisposer = null;
    renderLoginGate();
  };
  const run = async () => {
    if (reducedMotion()) {
      stage.style.opacity = "1";
      bird.style.opacity = "1";
      await wait(220);
    } else {
      await new Promise(resolve => animations.push(animate(stage,{
        opacity:[0,1], duration:480, ease:"outCubic", onComplete:resolve
      })));
      if (cancelled) return;
      animations.push(animate(bird,{
        opacity:[0,1], scale:[.88,1], translateY:[10,0],
        duration:880, ease:"outExpo"
      }));
      await wait(1080);
      if (cancelled) return;
      animations.push(animate(bird,{
        opacity:[1,0], scale:[1,1.035],
        duration:540, ease:"inCubic"
      }));
      await new Promise(resolve => animations.push(animate(stage,{
        opacity:[1,0], duration:620, delay:80, ease:"inCubic", onComplete:resolve
      })));
    }
    finish();
  };

  void run();
  currentDisposer = () => {
    cancelled = true;
    animations.forEach(animation => animation.pause());
  };
}

function renderLoginGate() {
  disposeCurrent();
  routeHistory.length = 0;
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
        <div class="login-ornament" aria-hidden="true"><span></span><i></i><b>✧</b><i></i><span></span></div>
        <p class="eyebrow">ACCOUNT ACCESS <b>01 / 04</b></p>
        <h1 id="login-title">Enter the <em>Archive.</em></h1>
        <p class="login-description">Verify your identity before entering Merzkava Pocket.</p>
        <div class="access-tabs" role="tablist" aria-label="Login method">
          <button type="button" class="is-active" data-role-tab="player" role="tab" aria-selected="true">PLAYER</button>
          <button type="button" data-role-tab="developer" role="tab" aria-selected="false">DEVELOPER</button>
        </div>
        <div class="player-gate-switch" data-player-gate-switch>
          <button type="button" class="is-active" data-player-mode="login" aria-pressed="true">PLAYER LOGIN</button>
          <button type="button" data-player-mode="register" aria-pressed="false">NEW PLAYER ACCOUNT</button>
        </div>
        <form class="access-form" data-player-form>
          <label for="player-name">CHARACTER NAME</label>
          <input id="player-name" name="characterName" type="text" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Enter your exact Player name" required><p class="field-note local-player-hint" data-local-player-hint>ENTER YOUR CHARACTER NAME TO CONTINUE.</p>
          <p class="field-note">Your character identity is matched with the Merzkava Universe registry. No Player password is required.</p>
          <button type="submit" class="primary-action">VERIFY PLAYER <span>↗</span></button>
        </form>
        <form class="access-form" data-player-register-form hidden>
          <label for="player-register-name">NEW POCKET PLAYER NAME</label>
          <input id="player-register-name" name="characterName" type="text" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Exact registered name" required>
          <p class="field-note">Create a new Player identity and prepare its first session. Pocket issues a save code when the identity check is complete.</p>
          <button type="submit" class="primary-action">REGISTER THIS PLAYER <span>↗</span></button>
        </form>
        <form class="access-form" data-developer-form hidden>
          <label for="developer-id">DEVELOPER ID</label>
          <input id="developer-id" name="identifier" type="text" maxlength="80" autocomplete="username" required>
          <label for="developer-password">PASSWORD</label>
          <div class="password-wrap"><input id="developer-password" name="password" type="password" maxlength="128" autocomplete="current-password" required><button type="button" data-password-toggle aria-label="Show password">◉</button></div>
          <label class="remember-row"><input type="checkbox" name="remember"> <span>Remember on this device</span></label>
          <p class="field-note">Developer access is verified through the online account gateway. Remember Me is optional and Developer-only.</p>
          <button type="submit" class="primary-action">VERIFY DEVELOPER <span>↗</span></button>
        </form>
        <p class="login-message" data-login-message role="status" aria-live="polite"></p>
        <div class="login-footer"><span>PLAYER ACCESS</span><span>DEVELOPER ACCESS</span><span>SEPARATE ROLES</span></div>
      </section>
      ${accessBufferMarkup("IDENTITY VERIFICATION")}
    </main>`;
  applyTheme();
  const stage = root.querySelector("[data-login-stage]");
  const message = stage.querySelector("[data-login-message]");
  const playerForm = stage.querySelector("[data-player-form]");
  const playerRegisterForm = stage.querySelector("[data-player-register-form]");
  const playerGateSwitch = stage.querySelector("[data-player-gate-switch]");
  const playerModeButtons = [...stage.querySelectorAll("[data-player-mode]")];
  const developerForm = stage.querySelector("[data-developer-form]");
  const tabs = [...stage.querySelectorAll("[data-role-tab]")];
  const localNamesHint = stage.querySelector("[data-local-player-hint]");
  const playerNameInput = stage.querySelector("#player-name");
  playerNameInput?.addEventListener("input", () => {
    const hasName = String(playerNameInput.value || "").trim().length > 0;
    if (localNamesHint) localNamesHint.textContent = hasName
      ? "IDENTITY REQUEST PREPARED · READY TO CONTINUE."
      : "ENTER YOUR CHARACTER NAME TO CONTINUE.";
  });
  let busy = false;

  stage.querySelectorAll("[data-theme-choice]").forEach(button => button.addEventListener("click", () => setTheme(button.dataset.themeChoice)));
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
  const choosePlayerMode = mode => {
    if (busy) return;
    const registering = mode === "register";
    playerForm.hidden = registering;
    playerRegisterForm.hidden = !registering;
    playerModeButtons.forEach(button => {
      const active = button.dataset.playerMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    message.textContent = "";
  };
  playerModeButtons.forEach(button => button.addEventListener("click", () => choosePlayerMode(button.dataset.playerMode)));
  const chooseRole = role => {
    if (busy) return;
    playerGateSwitch.hidden = role !== "player";
    playerForm.hidden = role !== "player";
    playerRegisterForm.hidden = true;
    playerModeButtons.forEach(button => {
      const active = button.dataset.playerMode === "login";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
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
    if (role === "player" && !name.trim()) { message.textContent = "Enter the exact registered character name."; return; }
    if (role === "developer" && (!identifier || !password)) { message.textContent = "Enter both Developer ID and password."; return; }
    busy = true;
    stage.dataset.busy = "true";
    message.textContent = "";
    activeAccessAbort?.abort();
    activeAccessAbort = new AbortController();
    try {
      const identity = await runAccessSequence(role, () => role === "player"
        ? invokeNative("verifyPlayerIdentity", [name.trim()], activeAccessAbort.signal)
        : invokeNative("authenticateDeveloper", [identifier, password, values.get("remember") === "on"], activeAccessAbort.signal), activeAccessAbort.signal);
      accessIdentity = identity;
      void startPocketGiftRuntime(identity).catch(()=>{});
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
  playerRegisterForm.addEventListener("submit", event => {
    event.preventDefault();
    if (busy) return;
    if (!nativeReady()) { message.textContent = "Android access adapter unavailable. This route remains locked."; return; }
    const values = new FormData(playerRegisterForm);
    const name = String(values.get("characterName") || "").trim();
    if (!name) { message.textContent = "Enter the exact registered character name."; return; }
    busy = true;
    stage.dataset.busy = "true";
    message.textContent = "";
    activeAccessAbort?.abort();
    activeAccessAbort = new AbortController();
    const signal = activeAccessAbort.signal;
    const runRegistration = async () => invokeNative("registerPocketPlayerAccount", [name], signal);
    void runAccessSequence("player", runRegistration, signal).then(identity => {
      accessIdentity = identity;
      void startPocketGiftRuntime(identity).catch(()=>{});
      showFloatingControl();
    }).catch(error => {
      if (error?.name === "AbortError") message.textContent = "Registration cancelled.";
      else message.textContent = error instanceof Error ? error.message : "Player registration failed.";
      if (!reducedMotion()) animate(message, { opacity:[.45,1], translateX:[-3,3,0], duration:260, ease:"outQuad" });
    }).finally(() => {
      busy = false;
      stage.dataset.busy = "false";
      activeAccessAbort = null;
    });
  });
  developerForm.addEventListener("submit", event => void submit(event,"developer"));
  const enter = stage.querySelector(".login-card");
  if (!reducedMotion()) animate(enter, { opacity:[0,1], translateY:[18,0], scale:[.985,1], duration:620, ease:"outCubic" });
  currentDisposer = () => { activeAccessAbort?.abort(); };
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
        <small class="network-access-note">NETWORK ACCESS · AUTOMATIC</small>
      </section>
      <div class="section-label"><span>INITIAL SETUP</span><small>01 — 03 · COMPLETE IN ORDER</small></div>
      <section class="setup-list">
        <article class="setup-row" data-step="overlay"><span class="step-no">01</span><div><strong>Display over other apps</strong><small>Allow Pocket to appear above other apps.</small></div><button type="button" data-permission="overlay" aria-label="Open display-over-apps settings" >◈</button></article>
        <article class="setup-row" data-step="notifications"><span class="step-no">02</span><div><strong>Notifications</strong><small>Allow the ongoing Floating Control notification.</small></div><button type="button" data-permission="notifications" aria-label="Allow notifications"  disabled>♧</button></article>
        <article class="setup-row" data-step="battery"><span class="step-no">03</span><div><strong>Background activity</strong><small>Double-tap to open settings.</small></div><button type="button" data-permission="battery" aria-label="Double-tap to open battery settings"  disabled>⚙</button></article>
      </section>
      <div class="section-label"><span>QUICK ACTIONS</span><small>SESSION CONTROLS</small></div>
      <section class="floating-actions">
        <button class="continue-action" type="button" data-action="continue"><span><small>ENTER POCKET</small><strong>Open game / continue playing</strong></span><b>↗</b></button>
        <button type="button" data-action="mini" disabled><span><small>WINDOW</small><strong>Open floating mini window</strong></span><b>↗</b></button>
        <button type="button" data-action="stop" disabled><span><small>SERVICE</small><strong>Stop service and close window</strong></span><b>×</b></button>
        <button type="button" data-action="donate"><span><small>A LITTLE KINDNESS</small><strong>Donate / send a kind wish</strong></span><b>↗</b></button>
      </section>
      <p class="floating-feedback" role="status" aria-live="polite" data-floating-feedback></p>
      <p class="kindness-note">A quiet wish is already more than enough.</p>
      <footer class="floating-footer"><span>MERZKAVA POCKET · MADE WITH CARE</span><span>${escapeHtml(identity.displayName)} · ${identity.role.toUpperCase()}</span></footer>
      <button type="button" class="signout-action" data-signout>LOCK / SIGN OUT</button>
      ${accessBufferMarkup("POCKET TRANSITION")}
      <div class="donate-overlay" data-donate-panel hidden aria-hidden="true">
        <section class="donate-card" role="dialog" aria-modal="true" aria-labelledby="donate-title">
          <button type="button" class="donate-close" data-donate-close aria-label="Close kindness panel">×</button>
          <div class="donate-scene" aria-hidden="true">
            <div class="donate-window"><i class="tree-one"></i><i class="tree-two"></i><i class="window-light"></i></div>
            <div class="donate-bed"><i></i><b></b><span></span></div>
            <div class="donate-lamp"></div>
          </div>
          <div class="donate-copy">
            <span>A LITTLE KINDNESS</span>
            <h2 id="donate-title">A gentle wish is enough.</h2>
            <p>If you'd like to support this little project, all we ask for is your kindest wishes. May the developer be given a longer, gentler stretch of rest — with every breath coming easy, and no pain to carry.</p>
            <p class="donate-secondary">No pressure. No payment needed. Your kind thoughts are already a gift.</p>
            <button type="button" class="donate-send" data-donate-send>SEND A LITTLE KINDNESS</button>
          </div>
        </section>
      </div>
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
  let transitionBusy = false;
  const feedback = stage.querySelector("[data-floating-feedback]");
  const statusPanel=stage.querySelector(".floating-status-panel");
  statusPanel.addEventListener("pointerdown",event=>{
    if(reduce)return;
    const bounds=statusPanel.getBoundingClientRect();
    statusPanel.style.transformOrigin=(event.clientX-bounds.left)+"px "+(event.clientY-bounds.top)+"px";
    animate(statusPanel,{scale:[1,1.012,.998,1],rotate:[0,-.12,.12,0],duration:520,ease:"outElastic(1,.5)"});
  });
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
      button.textContent=ready?"✓":({"overlay":"◈","notifications":"♧","battery":"⚙"}[key]||"↗");
      button.setAttribute("aria-label",ready?"Permission ready":("Open "+key+" permission settings"));
      button.closest(".setup-row").classList.toggle("is-complete",!!ready);
    });
    stage.querySelector('[data-action="mini"]').disabled=!state.supported || !state.displayOverApps || floatingBusy;
    stage.querySelector('[data-action="stop"]').disabled=!state.supported || !state.serviceRunning || floatingBusy;
    stage.querySelector('[data-action="continue"]').disabled=transitionBusy;
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
  let lastBatteryTap=0;
  stage.querySelectorAll("[data-permission]").forEach(button=>button.addEventListener("click",()=>{
    const key=button.dataset.permission;
    if(key==="battery"){
      const now=Date.now();
      if(now-lastBatteryTap>480){
        lastBatteryTap=now;
        feedback.textContent="DOUBLE-TAP THE SETTINGS ICON TO OPEN ANDROID BATTERY SETTINGS.";
        return;
      }
      lastBatteryTap=0;
    }
    void run(async()=>{
      if(key==="overlay")native.requestOverlayPermission();
      else if(key==="notifications")native.requestNotifications();
      else native.requestBatteryExemption();
      feedback.textContent="COMPLETE THE ANDROID SYSTEM STEP, THEN RETURN TO POCKET.";
    });
  }));
  const continueButton=stage.querySelector('[data-action="continue"]');
  const transitionCancel=stage.querySelector("[data-access-cancel]");
  const donatePanel=stage.querySelector("[data-donate-panel]");
  const closeDonate=()=>{
    donatePanel.hidden=true;
    donatePanel.setAttribute("aria-hidden","true");
  };
  stage.querySelector('[data-action="donate"]').addEventListener("click",()=>{
    donatePanel.hidden=false;
    donatePanel.setAttribute("aria-hidden","false");
    donatePanel.querySelector("[data-donate-close]").focus();
  });
  donatePanel.querySelector("[data-donate-close]").addEventListener("click",closeDonate);
  donatePanel.addEventListener("click",event=>{
    if(event.target===donatePanel || event.target?.closest?.("[data-donate-dismiss]"))closeDonate();
  });
  donatePanel.querySelector("[data-donate-send]").addEventListener("click",()=>{
    const copy=donatePanel.querySelector(".donate-copy");
    copy.classList.add("is-kindness-received");
    copy.innerHTML='<span>A KIND THOUGHT RECEIVED</span><p class="kindness-received">Simpan saja, ada yang lebih membutuhkan di sekitarmu.</p><button type="button" class="donate-send" data-donate-dismiss>RETURN TO POCKET</button>';
  });
  const enterPocket=async()=>{
    if(transitionBusy||disposed)return;
    transitionBusy=true;
    continueButton.disabled=true;
    const controller=new AbortController();
    const cancelRoutine=()=>controller.abort();
    transitionCancel.addEventListener("click",cancelRoutine,{once:true});
    try{
      await runAccessSequence("transition",async()=>{
        if(!accessIdentity)throw new Error("The verified Pocket session is missing.");
        setTheme(readTheme());
        if(nativeReady())JSON.parse(native.getReadiness());
        return true;
      },controller.signal);
      if(!disposed)showSplash();
    }catch(error){
      if(error?.name==="AbortError")feedback.textContent="POCKET ENTRY CANCELLED.";
      else feedback.textContent=error instanceof Error?error.message:"Pocket could not be opened.";
    }finally{
      transitionCancel.removeEventListener("click",cancelRoutine);
      if(!disposed){
        transitionBusy=false;
        continueButton.disabled=false;
      }
    }
  };
  continueButton.addEventListener("click",()=>void enterPocket());
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
      <div class="splash-layout">
        ${renderFoxSplashMarkup()}
        <div class="splash-copy">
          <span class="splash-kicker">A LITTLE WORLD, ALWAYS WITHIN REACH</span>
          <div class="splash-logo">MERZKAVA</div>
          <span class="splash-rule"></span>
          <div class="splash-subtitle-row" aria-label="Pocket, powered by CRIWARE">
            <span class="splash-subtitle">POCKET</span>
            <span class="splash-criware-divider" aria-hidden="true"></span>
            <img class="splash-criware-logo" src="/splash-screen/criware/criware_logo01.png" alt="CRIWARE" decoding="async">
          </div>
          <small class="splash-foot">THE ARCHIVE OPENS</small>
        </div>
      </div>
      <span class="splash-corner corner-a"></span><span class="splash-corner corner-b"></span>
    </main>`;
  const stage=root.querySelector("[data-splash]");
  const content=stage.querySelector(".splash-copy");
  const character=stage.querySelector(".splash-character");
  const logo=stage.querySelector(".splash-logo");
  const rule=stage.querySelector(".splash-rule");
  const stopFoxMotion=mountFoxSplashMotion(stage,{animate,reducedMotion});
  let cancelled=false;
  const animations=[];
  const complete=()=>{
    if(cancelled)return;
    // Startup sound order: splash -> record placement cue -> CRI BGM fade-in.
    audioDirector.startStartupSequence();
    renderHome();
  };
  const run=async()=>{
    if(reducedMotion()){
      stage.style.opacity="1";character.style.opacity="1";content.style.opacity="1";logo.style.opacity="1";await wait(850);
    }else{
      await new Promise(resolve=>animations.push(animate(stage,{opacity:[0,1],duration:430,ease:"outCubic",onComplete:resolve})));
      if(cancelled)return;
      animations.push(animate(character,{opacity:[0,1],translateY:[13,0],scale:[.94,1],duration:760,delay:60,ease:"outCubic"}));
      animations.push(animate(content,{opacity:[0,1],translateY:[12,0],duration:620,delay:160,ease:"outCubic"}));
      animations.push(animate(logo,{opacity:[0,1],scale:[.975,1],duration:780,delay:260,ease:"outCubic"}));
      animations.push(animate(rule,{scaleX:[0,1],duration:520,delay:520,ease:"outCubic"}));
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
  currentDisposer=()=>{cancelled=true;animations.forEach(item=>item.pause());stopFoxMotion();};
}

function renderHome() {
  routeHistory.length = 0;
  renderPage("home");
}
function readLocalPlayerNames() {
  if (!nativeReady()) return [];
  try {
    const reader = typeof native.getPocketRegisteredPlayerNames === "function"
      ? native.getPocketRegisteredPlayerNames
      : native.getLocalPlayerNames;
    if (typeof reader !== "function") return [];
    const data = JSON.parse(reader.call(native) || "[]");
    return Array.isArray(data)
      ? data.map(value => String(value).trim()).filter(Boolean)
      : [];
  } catch { return []; }
}

function mountLegalNotices() {
  const button = root.querySelector("[data-legal-notices-toggle]");
  const output = root.querySelector("[data-legal-notices-output]");
  if (!button || !output) return () => {};
  let loading = false;
  const toggle = async () => {
    if (loading) return;
    if (!output.hidden) {
      output.hidden = true;
      button.textContent = "VIEW FULL LICENCES";
      button.setAttribute("aria-expanded", "false");
      return;
    }
    if (output.dataset.loaded !== "true") {
      loading = true;
      button.disabled = true;
      button.textContent = "LOADING LICENCES...";
      try {
        const response = await fetch("/THIRD_PARTY_NOTICES.txt", { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        output.textContent = await response.text();
        output.dataset.loaded = "true";
      } catch {
        output.textContent = "Full notices are unavailable in this build. The source inventory is in docs/legal/THIRD_PARTY_NOTICES.md.";
      } finally {
        loading = false;
        button.disabled = false;
      }
    }
    output.hidden = false;
    button.textContent = "HIDE FULL LICENCES";
    button.setAttribute("aria-expanded", "true");
  };
  button.addEventListener("click", toggle);
  return () => button.removeEventListener("click", toggle);
}

function renderPage(destination, transitionDuration=420) {
  disposeCurrent();
  currentRoute=destination;
  let pageMarkup="";
  if(destination==="home"){
    pageMarkup=`
      <main class="home-stage">
        <header class="home-topline">
          <span class="micro-brand">MERZKAVA POCKET</span>
          <div class="home-header-actions">
            <button type="button" class="floating-bubble-toggle" data-floating-bubble aria-label="Start floating bubble" aria-pressed="false">
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 9 8 4.5M21 9l3-4.5M6.5 11.5h19v14h-19zM9.5 14.5h11v8h-11zM23 15.5h.1M23 20h.1M12 26v2m8-2v2"/></svg><i aria-hidden="true"></i>
            </button>
            <button type="button" class="home-header-icon" data-app-minimize aria-label="Minimize Pocket"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.5h14"/></svg></button>
            <button type="button" class="home-header-icon" data-app-reload aria-label="Reload Pocket"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 1 4"/><path d="M20 4v7h-7"/></svg></button>
          </div>
          <span class="bubble-feedback" data-bubble-feedback role="status" aria-live="polite"></span>
        </header>
        <section class="home-brand"><span class="brand-kicker">THE POCKET ARCHIVE</span><h1>MERZKAVA</h1><span class="home-subtitle">A LITTLE WORLD, ALWAYS WITHIN REACH</span><div class="brand-divider"><i></i><span></span><i></i></div></section>
        <section class="home-world-panel" data-world-pocket-artwork aria-label="World Pocket artwork panel"></section>
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
        <article class="destination-card"><span>02 / DAILY LIFE</span><strong>Living Economy</strong><small>Explore the item register, local wallet, gathering, construction, facilities and defined production chains.</small><button type="button" data-subroute="economy">OPEN ECONOMY ↗</button></article>
      </main>`;
  } else if(destination==="home-base"){
    pageMarkup='<main class="home-base-host" data-home-base-root></main>';
  } else if(destination==="city"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">GAME / CITY</span><h1>City.</h1><p class="page-lead">Choose a connected destination from the city layer.</p>
      <article class="destination-card"><span>03 / WORLD SCALE</span><strong>World Map</strong><small>World-scale geography belongs inside Game.</small><button data-subroute="world-map">OPEN WORLD MAP ↗</button></article></main>`;
  } else if(destination==="world-map"){
    pageMarkup=`
      <main class="page-stage"><span class="eyebrow">GAME / WORLD MAP</span><h1>World Map.</h1><p class="page-lead">The map data is not included in this shell build.</p>
      <article class="destination-card"><span>WORLD ATLAS</span><strong>Geographic layer</strong><small>Map content will be connected from the reviewed Universe sources; no placeholder geography is invented here.</small><button data-subroute="city">RETURN TO CITY ↗</button></article></main>`;
  } else if(destination==="economy"){
    pageMarkup=economyMarkup();
  } else if(destination==="daily-login"){
    pageMarkup=dailyLoginMarkup();
  } else if(destination==="player-list"){
    if (!accessIdentity) { renderLoginGate(); return; }
    pageMarkup=playerRecordsMarkup(accessIdentity);
  } else {
    pageMarkup=`
      <main class="page-stage settings-page-stage"><span class="eyebrow">SETTINGS / PREFERENCES</span><h1>Make it yours.</h1><p class="page-lead">Display and account controls.</p>
      <article class="destination-card visual-section"><div class="settings-section-heading"><i class="settings-symbol visual-symbol" aria-hidden="true"></i><span>VISUAL</span><small>APPEARANCE & AMBIENCE</small></div>
        <section class="visual-setting"><strong>Display Theme</strong><div class="theme-options"><button data-theme-choice="dark" aria-pressed="false">DARK THEME</button><button data-theme-choice="light" aria-pressed="false">WHITE THEME</button></div></section>
        ${paperLightControlMarkup()}
      </article>

      <article class="destination-card audio-section" data-audio-section>
        <button type="button" class="audio-section-toggle" data-audio-toggle aria-expanded="false">
          <i class="settings-symbol audio-symbol" aria-hidden="true"></i>
          <span>AUDIO</span><small>VINYL LIBRARY & PLAYBACK</small><b aria-hidden="true">⌄</b>
        </button>
        <div class="audio-content" data-audio-content hidden>
          <section class="audio-player" data-audio-player>
            <div class="audio-player-heading"><span>NOW ON THE PLATTER</span><small>POCKET RECORD DECK</small></div>
            <div class="turntable">
              <div class="turntable-platter">
                <div class="vinyl-disc"><div class="vinyl-grooves"></div><div class="vinyl-label style-${vinylDesigns.getState().id}" data-vinyl-label>${vinylLabelContents(vinylDesigns.getState().style)}</div></div>
              </div>
              <div class="turntable-spindle"></div>
              <button type="button" class="turntable-needle" data-audio-needle aria-label="Lower the stylus and play music" aria-pressed="false">
                <i class="needle-pivot"></i><span class="needle-linkage" aria-hidden="true"><i class="needle-arm"></i><i class="needle-head"><i class="needle-tip"></i></i></span>
              </button>
              <span class="turntable-speed">33⅓ RPM</span>
              <span class="turntable-status-light"></span>
            </div>
            <div class="audio-current-track"><span>SELECTED RECORD</span><strong data-track-title>Happy-1a</strong><small data-audio-status aria-live="polite" aria-busy="false">NEEDLE LIFTED · READY</small></div>
            <div class="audio-volume-controls">
              <label><span>MUSIC VOLUME</span><output data-music-volume-value>68%</output><input data-music-volume type="range" min="0" max="100" step="1" value="68" aria-label="Music volume"></label>
              <label><span>VINYL AMBIENCE</span><output data-ambience-volume-value>34%</output><input data-ambience-volume type="range" min="0" max="100" step="1" value="34" aria-label="Vinyl ambience volume"></label>
              <label><span>SOUND EFFECTS</span><output data-effects-volume-value>76%</output><input data-effects-volume type="range" min="0" max="100" step="1" value="76" aria-label="Sound effects volume"></label>
            </div>
          </section>
          <section class="audio-rack">
            <div class="audio-rack-heading">
              <span>RECORD RACK</span>
              <div class="audio-rack-tools">
                <small>YOUR RECORD COLLECTION</small>
                <button type="button" class="audio-edit-toggle" data-audio-edit-list aria-pressed="false">EDIT RACK</button>
              </div>
            </div>
            <div class="audio-record-list" data-audio-record-list aria-label="Music library"></div>
            <p class="audio-rack-note">Choose a record to load it onto the platter. Lower the stylus to play; lift it to pause.</p>
            <div class="audio-import-tools">
              <button type="button" class="audio-add-button" data-audio-add>
                <span class="audio-package-icon" aria-hidden="true"><i></i><b></b><em></em></span>
                <span><strong>ADD A PERSONAL RECORD</strong><small>CHOOSE FROM THIS DEVICE</small></span>
                <b aria-hidden="true">↗</b>
              </button>
              <p class="audio-format-note">Add ADX or another audio file your device can open (OGG, MP3, M4A, AAC, FLAC or WAV). ADX stays in its original format; other tracks are prepared for the Pocket deck. Your records stay in this private rack on this device. Up to 64 MB each.</p>
            </div>
          </section>
          <section class="vinyl-style-drawer" data-vinyl-drawer>
            <button type="button" class="vinyl-drawer-toggle" data-vinyl-drawer-toggle aria-expanded="false">
              <span><b>LABEL DRAWER</b><small>20 CENTER-LABEL DESIGNS</small></span>
              <i aria-hidden="true">⌃</i>
            </button>
            <div class="vinyl-drawer-panel" data-vinyl-drawer-panel hidden>
              <div class="vinyl-drawer-grip" data-vinyl-drawer-grip role="button" tabindex="0" aria-label="Swipe down or tap to close the label drawer">
                <i></i><span>DRAG DOWN TO CLOSE</span>
              </div>
              <div class="vinyl-drawer-tools">
                <span data-vinyl-style-mode>AUTO · CHANGES EACH TRACK / SEASON</span>
                <button type="button" data-vinyl-auto aria-pressed="true">AUTO ROTATION</button>
              </div>
              <div class="vinyl-style-grid">
                ${VINYL_STYLES.map(vinylStyleOptionMarkup).join("")}
              </div>
            </div>
          </section>
        </div>
        <div class="audio-import-overlay" data-audio-import-overlay hidden aria-hidden="true">
          <section class="audio-import-card" role="dialog" aria-modal="true" aria-labelledby="audio-import-title">
            <span class="audio-import-emblem" aria-hidden="true">♫</span>
            <p class="audio-import-kicker" data-audio-import-kicker>RECORD ARCHIVE</p>
            <h3 id="audio-import-title" data-audio-import-title>Record added</h3>
            <p class="audio-import-message" data-audio-import-message></p>
            <small class="audio-import-footnote">PERSONAL MUSIC · PRIVATE POCKET RACK · MAX 64 MB</small>
            <div class="audio-import-actions">
              <button type="button" class="audio-import-confirm" data-audio-import-confirm hidden>REMOVE RECORD</button>
              <button type="button" class="audio-import-close" data-audio-import-close>RETURN TO AUDIO</button>
            </div>
          </section>
        </div>
      </article>
      <article class="destination-card personal-section"><div class="settings-section-heading"><i class="settings-symbol personal-symbol" aria-hidden="true"></i><span>PERSONAL STUFF</span><small>YOUR POCKET PROFILE</small></div><section class="personal-setting"><div class="personal-account-icon" aria-hidden="true"></div><div class="personal-account-copy"><span>ACCOUNT & ACCESS</span><strong>${escapeHtml(accessIdentity?.displayName||"Pocket User")}</strong><small>${(accessIdentity?.role||"player").toUpperCase()} SESSION</small></div><button class="logout-button" data-signout><i class="logout-symbol" aria-hidden="true"></i>LOCK / SIGN OUT</button></section></article>
      <details class="legal-credits">
        <summary><span>LEGAL & CREDITS</span><small>LICENCES · ATTRIBUTIONS · OPEN-SOURCE NOTICES</small></summary>
        <div class="legal-credits-body">
          <p><b>VINYL SURFACE NOISE</b> · “Warm organic vinyl record crackle #6” — Sdanezis / Pixabay. Converted for use as a CRI-managed loop under the Pixabay Content License; not offered as a standalone audio file. <span class="legal-source-credit">SOURCE · PIXABAY / SDANEZIS</span></p>
          <p><b>DAILY LOGIN WEATHER</b> · Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, using a representative reference point from the phone IANA time zone. No GPS, IP geolocation, Android location service or location permission is used. Weather data is CC BY 4.0; the free API is for non-commercial use. <span class="legal-source-credit">SOURCE · OPEN-METEO / IANA TZDB</span></p>
          <p><b>CRI ADX LE RUNTIME</b> · This application includes CRI ADX LE runtime libraries. You may not reverse engineer, decompile nor disassemble these runtime libraries. You may not reuse these runtime libraries and/or any part thereof for your software development. CRI Middleware retains all rights to its runtime libraries.</p>
      <p>All Pocket music and sound effects are mixed by one CRI AtomEx runtime. Device-imported music is decoded to private PCM WAV before CRI playback; WebView audio playback is not used.</p>
      <p>Full npm dependency notices include direct and transitive packages. Existing built-in audio whose original source is not recorded is flagged separately in the notices.</p>
          <button type="button" data-legal-notices-toggle aria-expanded="false">VIEW FULL LICENCES</button>
          <pre data-legal-notices-output hidden></pre>
        </div>
      </details>
      <details class="destination-card update-section" data-update-section>
        <summary class="settings-section-heading update-section-toggle"><i class="settings-symbol update-symbol" aria-hidden="true"></i><span>POCKET UPDATE</span><small>BUILD & DEVICE STATUS</small><b aria-hidden="true">⌄</b></summary>
        <div class="update-content">
        <div class="update-status-line"><i data-update-status data-tone="checking" role="status">CHECKING FOR UPDATES</i><small>PUBLIC RELEASE CHANNEL</small></div>
        <div class="update-build-grid">
          <div class="update-build-cell"><small>INSTALLED BUILD</small><strong data-update-current-build>—</strong><span>THIS DEVICE</span></div>
          <div class="update-build-divider" aria-hidden="true">↗</div>
          <div class="update-build-cell is-latest"><small>LATEST BUILD</small><strong data-update-latest-build>—</strong><span data-update-version>VERSION CHECK</span></div>
        </div>
        <div class="update-package-row"><span><i class="update-package-dot"></i> ANDROID APK PACKAGE</span><b data-update-size>—</b></div>
        <details class="update-notes-block"><summary class="update-subheading update-notes-toggle"><span>WHAT'S NEW</span><small>RELEASE NOTES</small><b aria-hidden="true">⌄</b></summary><ul data-update-notes><li>Release notes will appear here when a new Pocket build is published.</li></ul></details>
        <section class="update-storage-block">
          <div class="update-subheading"><span>DEVICE STORAGE</span><small>INTERNAL · AVAILABLE SPACE</small></div>
          <div class="update-storage-head"><strong data-update-storage-value>—</strong><span>FREE SPACE</span></div>
          <div class="update-storage-bar" data-update-storage-bar role="progressbar" aria-label="Remaining internal device storage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-update-storage-fill></i><b aria-hidden="true"></b></div>
          <p data-update-storage-meta>Reading internal device storage…</p>
          <p class="update-storage-path" data-update-storage-path>UPDATE FOLDER · NOT SELECTED</p>
          <div class="update-folder-actions">
            <button type="button" data-update-folder-choose>CHOOSE FOLDER</button>
            <button type="button" data-update-folder-open hidden>OPEN IN FILE MANAGER</button>
            <button type="button" data-update-file-remove hidden>REMOVE APK</button>
          </div>
        </section>
        <section class="update-download-area" data-update-download-area hidden>
          <div class="update-subheading"><span>DOWNLOAD PROGRESS</span><strong data-update-progress-value>0%</strong></div>
          <div class="update-download-bar"><i data-update-progress-fill></i></div>
          <small data-update-progress-meta>Preparing Pocket update…</small>
        </section>
        <div class="update-actions">
          <button type="button" class="update-download-button" data-update-download hidden>DOWNLOAD UPDATE <b aria-hidden="true">↓</b></button>
          <button type="button" class="update-install-button" data-update-install hidden>INSTALL UPDATE <b aria-hidden="true">↗</b></button>
          <button type="button" class="update-check-button" data-update-check>CHECK AGAIN <b aria-hidden="true">⟳</b></button>
        </div>
        <p class="update-footnote">Updates are verified before Android opens the installer. Your installed Pocket data remains on this device.</p>
      </div>
      </details>
    </main>`;
  }
  if(destination==="home")pageMarkup+=accessBufferMarkup("APP RELOAD");
  const backMarkup=(destination==="home"||destination==="daily-login")?"":'<button type="button" class="page-back" data-page-back aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5 7.5 12l7 7M8 12h11"/></svg></button>';
  const shellNavigation=destination==="daily-login"?"":navigationMarkup();
  root.innerHTML = pageMarkup + backMarkup + shellNavigation;
  applyTheme();
  applyPaperGlow();
  root.querySelectorAll("[data-theme-choice]").forEach(button=>button.addEventListener("click",()=>setTheme(button.dataset.themeChoice)));
  root.querySelector("[data-paper-glow]")?.addEventListener("input",event=>setPaperGlow(event.currentTarget.value));
  root.querySelectorAll("[data-subroute]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.subroute)));
  root.querySelector("[data-page-back]")?.addEventListener("click",navigateBack);
  root.querySelector("[data-signout]")?.addEventListener("click",()=>void signOut());
  root.querySelector("[data-app-minimize]")?.addEventListener("click",()=>{
    if(nativeReady()&&typeof native.movePocketToBackground==="function")native.movePocketToBackground();
  });
  const reloadButton=root.querySelector("[data-app-reload]");
  let reloadBusy=false;
  reloadButton?.addEventListener("click",async()=>{
    if(reloadBusy||!accessIdentity)return;
    reloadBusy=true;reloadButton.disabled=true;reloadButton.classList.add("is-loading");
    try{
      await runAccessSequence("transition",async()=>{
        if(!accessIdentity)throw new Error("The verified Pocket session is missing.");
        setTheme(readTheme());
        if(nativeReady())JSON.parse(native.getReadiness());
        return true;
      },new AbortController().signal);
      if(currentRoute==="home")showSplash();
    }catch(error){
      const note=root.querySelector("[data-bubble-feedback]");
      if(note)note.textContent=error instanceof Error?error.message:"Pocket could not be reloaded.";
    }finally{
      reloadBusy=false;
      if(reloadButton.isConnected){reloadButton.disabled=false;reloadButton.classList.remove("is-loading");}
    }
  });
  const page=root.querySelector(".home-stage,.page-stage,.home-base-host");
  if(!reducedMotion()&&page)animate(page,{opacity:[0,1],translateY:[8,0],duration:transitionDuration,ease:"outCubic"});
  if(destination!=="daily-login")mountMenu();
  if(destination==="settings"){
    const menuCleanup=currentDisposer;
    const updateCleanup=mountPocketUpdateSettings();
    const audioCleanup=mountAudioSettings();
    const legalCleanup=mountLegalNotices();
    currentDisposer=()=>{menuCleanup?.();updateCleanup?.();audioCleanup?.();legalCleanup?.();};
  }
  if(destination==="economy"){
    const menuCleanup=currentDisposer;
    const economyCleanup=mountEconomy(root.querySelector("[data-economy-root]"),accessIdentity);
    currentDisposer=()=>{menuCleanup?.();economyCleanup?.();};
  }else if(destination==="home-base"){
    const menuCleanup=currentDisposer;
    let homeBaseCleanup=()=>{};
    currentDisposer=()=>{menuCleanup?.();homeBaseCleanup?.();};
    void mountHomeBase(root.querySelector("[data-home-base-root]"),accessIdentity,navigateBack,()=>currentRoute==="home-base")
      .then(cleanup=>{if(currentRoute==="home-base")homeBaseCleanup=cleanup;else cleanup();})
      .catch(error=>{const host=root.querySelector("[data-home-base-root]");if(host)host.textContent="Home Base error: "+error.message;});
  }else if(destination==="daily-login"){
    currentDisposer=mountDailyLogin(root.querySelector("[data-daily-login-root]"),()=>navigateBack(2000),accessIdentity);
  }else if(destination==="player-list"){
    const menuCleanup=currentDisposer;
    const playerRecordsCleanup=mountPlayerRecords(root.querySelector("[data-player-records-stage]"),accessIdentity,invokeNative);
    currentDisposer=()=>{menuCleanup?.();playerRecordsCleanup?.();};
  }
}

function navigationMarkup() {
  return `
    <div class="pull-cord-zone" data-pull-cord>
      <svg class="cord-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-cord-path d="M28 0 C28 28 28 70 28 112"/></svg>
      <span class="cord-wall-glow" data-cord-glow aria-hidden="true"></span>
      <button class="cord-handle" type="button" data-cord-handle aria-label="Drag pull-cord handle" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="cord-tv"><i class="antenna a"></i><i class="antenna b"></i><i class="tv-case"><b></b><em></em><u><s></s><s></s></u></i><i class="tv-foot left"></i><i class="tv-foot right"></i></span></button>
      <span class="cord-instruction" data-cord-instruction>PULL DOWN A LITTLE · RELEASE</span>
    </div>
    <div class="dock-wrap" data-dock><div class="dock-back"></div><div class="dock-brushes"><i></i><i></i><i></i><i></i></div>
      <nav class="dock-front" aria-label="Main navigation">
        <svg class="dock-wire-svg" data-dock-wire aria-hidden="true" focusable="false"><defs><linearGradient id="dock-wire-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#786348"/><stop offset=".48" stop-color="#d4bd91"/><stop offset="1" stop-color="#786348"/></linearGradient></defs><path class="dock-wire-shadow" data-wire-path></path><path class="dock-wire-line" data-wire-path></path><path class="dock-wire-glint" data-wire-path></path><g class="dock-wire-pins" data-wire-pins></g></svg>
        <button class="dock-item is-active" type="button" data-destination="home" aria-current="page"><span class="dock-sigil"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M4 16 18 5l14 11v15H4Z" fill="#789783" stroke="#d8d4b7"/><path d="M10 30V17l8-6 8 6v13" stroke="#f1eadb"/><path d="M14 30v-8h8v8" stroke="#d4b879"/><path d="M18 5V2" stroke="#d4b879"/></svg></span><b>HOME</b></button>
        <button class="dock-item" type="button" data-destination="game"><span class="dock-sigil"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M8 12.5c1.3-3 4-4.5 7-4.5h6c3 0 5.7 1.5 7 4.5l3 10.2c1.2 4-2.7 6.6-5.7 4.2L20 23h-4l-5.3 3.9C7.7 29.3 3.8 26.7 5 22.7Z" fill="#789783" stroke="#d8d4b7"/><path d="M11 15v6m-3-3h6" stroke="#f1eadb" stroke-width="1.7"/><circle cx="24" cy="16.5" r="1.5" fill="#d4b879" stroke="none"/><circle cx="27" cy="20" r="1.3" fill="#d4b879" stroke="none"/></svg></span><b>GAME</b></button>
        <button class="dock-item" type="button" data-destination="daily-login"><span class="dock-sigil"><svg viewBox="0 0 36 36" aria-hidden="true"><rect x="5" y="7" width="26" height="24" rx="3" fill="#789783" stroke="#d8d4b7"/><path d="M11 4v7M25 4v7M5 14h26" stroke="#f1eadb" stroke-width="1.5"/><path d="m18 17 2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6Z" fill="#d4b879" stroke="#f1eadb" stroke-width=".8"/></svg></span><b>DAILY LOG-IN</b></button>
        <button class="dock-item" type="button" data-destination="player-list"><span class="dock-sigil"><span class="profile-cultivator-icon" aria-hidden="true"><i class="profile-cultivator-aureole"></i><i class="profile-cultivator-blade"></i><i class="profile-cultivator-guard"></i><i class="profile-cultivator-grip"></i><i class="profile-cultivator-robe"></i><i class="profile-cultivator-mantle"></i><i class="profile-cultivator-inner"></i><i class="profile-cultivator-lapel"></i><i class="profile-cultivator-hem"></i><i class="profile-cultivator-fold fold-one"></i><i class="profile-cultivator-fold fold-two"></i><i class="profile-cultivator-belt"></i><i class="profile-cultivator-sleeve"></i><i class="profile-cultivator-cuff"></i><i class="profile-cultivator-hand"></i><i class="profile-cultivator-neck"></i><i class="profile-cultivator-face"></i><i class="profile-cultivator-hair"></i><i class="profile-cultivator-lock"></i></span></span><b>${accessIdentity?.role === "developer" ? "DATABASED" : "PROFILE"}</b></button>
        <button class="dock-item" type="button" data-destination="settings"><span class="dock-sigil"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M15 4h6l1 4 4 2 4-1 3 5-3 4v3l3 4-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-4v-3l-3-4 3-5 4 1 4-2Z" fill="#789783" stroke="#d8d4b7" transform="translate(0 -1) scale(1 .96)"/><circle cx="18" cy="18" r="5.5" fill="#f1eadb" stroke="#d4b879" stroke-width="1.2"/><circle cx="18" cy="18" r="2" fill="#789783" stroke="none"/></svg></span><b>SETTINGS</b></button>
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
  const instruction=zone.querySelector("[data-cord-instruction]");
  const wallGlow=zone.querySelector("[data-cord-glow]");
  const tiles=[...dock.querySelectorAll("[data-destination]")];
  const dockFront=dock.querySelector(".dock-front");
  const wireSvg=dock.querySelector("[data-dock-wire]");
  const wirePaths=[...wireSvg.querySelectorAll("[data-wire-path]")];
  const wirePins=wireSvg.querySelector("[data-wire-pins]");
  const syncDockWire=()=>{
    const frontRect=dockFront.getBoundingClientRect();
    if(frontRect.width<=0||frontRect.height<=0)return;
    const anchors=tiles.map(tile=>{
      const rect=tile.querySelector(".dock-sigil").getBoundingClientRect();
      return{x:rect.left+rect.width/2-frontRect.left,y:rect.top-frontRect.top+.8};
    });
    wireSvg.setAttribute("viewBox",`0 0 ${frontRect.width} ${frontRect.height}`);
    wireSvg.setAttribute("width",String(frontRect.width));
    wireSvg.setAttribute("height",String(frontRect.height));
    const d=anchors.slice(1).reduce((path,next,index)=>{
      const previous=anchors[index];
      const span=next.x-previous.x;
      const sag=Math.min(7,Math.max(4,span*.08));
      return path+` C ${previous.x+span*.32} ${previous.y+sag}, ${next.x-span*.32} ${next.y+sag}, ${next.x} ${next.y}`;
    },`M ${anchors[0].x} ${anchors[0].y}`);
    wirePaths.forEach(path=>path.setAttribute("d",d));
    wirePins.replaceChildren(...anchors.map(point=>{
      const pin=document.createElementNS("http://www.w3.org/2000/svg","circle");
      pin.setAttribute("cx",String(point.x));
      pin.setAttribute("cy",String(point.y));
      pin.setAttribute("r","2.35");
      return pin;
    }));
  };
  const bubbleButton=root.querySelector("[data-floating-bubble]");
  const bubbleFeedback=root.querySelector("[data-bubble-feedback]");
  let bubbleBusy=false;
  let disposed=false;
  const renderBubbleButton=state=>{
    if(!bubbleButton)return;
    const active=state.bubbleVisible===true;
    const serviceRunning=state.serviceRunning===true;
    const ready=state.supported&&state.displayOverApps&&state.notifications&&state.batteryExemption;
    bubbleButton.disabled=bubbleBusy||!state.supported||(!serviceRunning&&!ready);
    bubbleButton.classList.toggle("is-active",active);
    bubbleButton.setAttribute("aria-pressed",String(active));
    bubbleButton.setAttribute("aria-label",active?"Stop floating bubble":"Start floating bubble");
  };
  const refreshBubbleButton=()=>{floatingReadiness=readNativeFloatingState();renderBubbleButton(floatingReadiness);};
  const toggleFloatingBubble=async()=>{
    if(!bubbleButton||bubbleBusy||disposed)return;
    bubbleBusy=true;renderBubbleButton(floatingReadiness);
    setBubbleFeedback("");
    try{
      const state=readNativeFloatingState();floatingReadiness=state;
      if(state.serviceRunning){
        native.stopFloatingMode();
        await waitForNativeFloatingState(next=>!next.serviceRunning&&!next.bubbleVisible,1800);
        window.dispatchEvent(new CustomEvent("pocket:render-mode",{detail:{mode:"full"}}));
        setBubbleFeedback("FLOATING SERVICE STOPPED.");
      }else{
        const ready=state.supported&&state.displayOverApps&&state.notifications&&state.batteryExemption;
        if(!ready)throw new Error("Complete the Floating Control setup before starting the bubble.");
        if(native.startBubbleMode()!==true)throw new Error("Android rejected the floating-bubble request. Check the required permissions.");
        await waitForNativeFloatingState(next=>next.serviceRunning&&next.bubbleVisible,2600);
        window.dispatchEvent(new CustomEvent("pocket:render-mode",{detail:{mode:"bubble"}}));
        setBubbleFeedback("BUBBLE ACTIVE · TAP THE TV ICON TO RETURN.");
        if(typeof native.movePocketToBackground==="function")native.movePocketToBackground();
      }
    }catch(error){setBubbleFeedback(error instanceof Error?error.message:"Floating-bubble action failed.");}
    finally{bubbleBusy=false;refreshBubbleButton();}
  };
  bubbleButton?.addEventListener("click",()=>void toggleFloatingBubble());
  let bubbleFeedbackTimer=null;
  const setBubbleFeedback=message=>{if(!bubbleFeedback)return;bubbleFeedback.textContent=message;window.clearTimeout(bubbleFeedbackTimer);if(message)bubbleFeedbackTimer=window.setTimeout(()=>{if(bubbleFeedback.textContent===message)bubbleFeedback.textContent="";},3200);};
  const bubbleResume=()=>{if(!disposed)refreshBubbleButton();};
  window.addEventListener("pocket:native-resume",bubbleResume);
  window.addEventListener("focus",bubbleResume);
  const activeDestination=["home-base","city","world-map","economy"].includes(currentRoute)?"game":currentRoute;
  tiles.forEach(tile=>{const active=tile.dataset.destination===activeDestination;tile.classList.toggle("is-active",active);if(active)tile.setAttribute("aria-current","page");else tile.removeAttribute("aria-current");});
  const HANDLE_ANCHOR_X=28.5;
  const TV_CASE_TOP=18;
  const CORD_HIDE_DEPTH=5;
  const PULL_THRESHOLD=42;
  let pointerId=null,start={x:0,y:0},pointerOrigin={x:0,y:0},dragOrigin={x:0,y:0},current={x:0,y:0},rest={x:0,y:130},dragged=false,idle=null,recoil=null;
  const bounds=()=>({w:window.innerWidth,h:window.innerHeight});
  const cordSvg=zone.querySelector(".cord-svg");
  const syncLayout=()=>{const b=bounds();cordSvg.setAttribute("viewBox",`0 0 ${b.w} ${b.h}`);rest={x:b.w*.25+HANDLE_ANCHOR_X,y:112+TV_CASE_TOP};if(pointerId===null)draw(rest);};
  const clamp=(x,y)=>{const b=bounds();return{x:Math.max(HANDLE_ANCHOR_X,Math.min(b.w-(58-HANDLE_ANCHOR_X),x)),y:Math.max(48,Math.min(b.h-(58-TV_CASE_TOP),y))};};
  const draw=point=>{
    current={...point};
    const dx=point.x-rest.x,dy=point.y,endY=point.y+CORD_HIDE_DEPTH;
    // The final cord segment enters the casing and is covered by the TV layer.
    path.setAttribute("d",`M ${rest.x} 0 C ${rest.x+dx*.08} ${dy*.42}, ${point.x-dx*.14} ${endY-dy*.28}, ${point.x} ${endY}`);
    handle.style.left=(point.x-HANDLE_ANCHOR_X)+"px";
    handle.style.top=(point.y-TV_CASE_TOP)+"px";
    instruction.style.left=(point.x-HANDLE_ANCHOR_X+4)+"px";
    instruction.style.top=(point.y-TV_CASE_TOP+64)+"px";
    if(wallGlow){wallGlow.style.left=(point.x-106)+"px";wallGlow.style.top=(point.y-39)+"px";}
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
  const showZone=active=>{instruction.textContent=active?"PULL DOWN A LITTLE":"PULL DOWN A LITTLE · RELEASE";instruction.classList.toggle("is-visible",active);zone.classList.toggle("is-touched",active);handle.classList.toggle("is-touched",active);};
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
    const pulled=Math.max(0,p.y-rest.y),readyToRelease=pulled>=PULL_THRESHOLD;
    instruction.textContent=readyToRelease?"RELEASE TO TOGGLE MENU":"PULL DOWN A LITTLE";
    handle.setAttribute("aria-valuenow",String(Math.max(0,Math.min(100,Math.round(pulled/PULL_THRESHOLD*100)))));
  };
  const down=event=>{
    if(disposed||pointerId!==null||event.button!==0)return;
    event.preventDefault();pointerId=event.pointerId;
    pointerOrigin={x:event.clientX,y:event.clientY};dragOrigin={...current};
    begin(current);handle.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    if(pointerId!==event.pointerId)return;
    event.preventDefault();
    update({x:dragOrigin.x+(event.clientX-pointerOrigin.x),y:dragOrigin.y+(event.clientY-pointerOrigin.y)});
  };
  const up=(event,cancelled)=>{
    if(pointerId!==event.pointerId)return;
    const activate=!cancelled&&dragged&&(current.y-rest.y)>=PULL_THRESHOLD;
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
    else if(pointerId===-1){const step=event.shiftKey?90:48;const p={...current};if(event.key==="ArrowDown")p.y+=step;else if(event.key==="ArrowUp")p.y-=step;else if(event.key==="ArrowLeft")p.x-=step;else if(event.key==="ArrowRight")p.x+=step;else if(event.key===" "){event.preventDefault();const activate=dragged&&(current.y-rest.y)>=PULL_THRESHOLD;pointerId=null;snapBack(activate);return;}else return;event.preventDefault();update(p);}
  });
  const lightTap=event=>{
    const tile=event.currentTarget,rect=tile.getBoundingClientRect();
    tile.style.setProperty("--tap-x",((event.clientX-rect.left)/rect.width*100)+"%");
    tile.style.setProperty("--tap-y",((event.clientY-rect.top)/rect.height*100)+"%");
    tile.classList.remove("is-lit");
    void tile.offsetWidth;
    tile.classList.add("is-lit");
  };
  tiles.forEach(tile=>{
    tile.addEventListener("pointerdown",lightTap);
    tile.addEventListener("click",()=>{
      const destination=tile.dataset.destination;
      navigate(destination);
    });
  });
  scrim.addEventListener("click",()=>setMenu(false));
  menuController={setMenu,get open(){return menuOpen;},close:()=>setMenu(false)};
  dock.classList.toggle("is-open",menuOpen);
  dock.classList.toggle("is-closed",!menuOpen);
  scrim.classList.toggle("is-visible",menuOpen);
  scrim.disabled=!menuOpen;
  tiles.forEach(tile=>{tile.inert=!menuOpen;tile.tabIndex=menuOpen?0:-1;});
  syncLayout();
  const resizeHandler=()=>{syncLayout();syncDockWire();};window.addEventListener("resize",resizeHandler);
  syncDockWire();draw(rest);startIdle();
  void refreshBubbleButton();
  currentDisposer=()=>{window.removeEventListener("resize",resizeHandler);
    window.removeEventListener("pocket:native-resume",bubbleResume);
    window.removeEventListener("focus",bubbleResume);
    window.clearTimeout(bubbleFeedbackTimer);
    disposed=true;idle?.pause();recoil?.pause();
    handle.removeEventListener("pointerdown",down);handle.removeEventListener("pointermove",move);
    tiles.forEach(tile=>tile.removeEventListener("pointerdown",lightTap));
    if(pointerId!==null){try{handle.releasePointerCapture(pointerId);}catch{}}
    menuController=null;
  };
}

function navigate(destination) {
  if(!["home","game","daily-login","settings","home-base","city","world-map","economy","player-list"].includes(destination))return;
  if(destination===currentRoute)return;
  routeHistory.push(currentRoute);
  renderPage(destination);

}

function navigateBack(transitionDuration=420) {
  const previous = routeHistory.pop();
  if (previous) {
    renderPage(previous,transitionDuration);

    return;
  }
  if (currentRoute !== "home") {
    renderPage("home",transitionDuration);

  }
}

async function signOut() {
  if (!nativeReady()) return;
  stopPocketGiftRuntime();
  if (accessIdentity?.role==="developer") {
    try { native.lockDeveloperSession(); } catch {}
  } else if (accessIdentity?.role==="player") {
    try { native.lockPlayerSession?.(); } catch {}
  }
  accessIdentity=null;
  routeHistory.length=0;
  floatingReadiness={displayOverApps:false,notifications:false,batteryExemption:false,serviceRunning:false,bubbleVisible:false,supported:false};
  renderLoginGate();
}

window.addEventListener("pocket:android-back",()=>{
  if(currentRoute==="login")return;
  if(currentRoute==="floating"){void signOut();return;}
  if(currentRoute==="splash")return;
  if(backPrompt){backPrompt.remove();backPrompt=null;return;}
  if(menuController?.open){menuController.close();return;}
  if(currentRoute!=="home") return navigateBack();
  backPrompt=document.createElement("div");
  backPrompt.className="exit-prompt";
  backPrompt.innerHTML='<section role="dialog" aria-modal="true"><span class="eyebrow">MERZKAVA POCKET</span><h2>Leave the Archive?</h2><p>Close Pocket and end this app session?</p><div><button data-stay>STAY</button><button data-exit>EXIT</button></div></section>';
  root.append(backPrompt);
  backPrompt.querySelector("[data-stay]").addEventListener("click",()=>{backPrompt?.remove();backPrompt=null;});
  backPrompt.querySelector("[data-exit]").addEventListener("click",()=>{try{native.exitApp();}catch{}});
});
window.addEventListener("keydown",event=>{if(event.key==="Escape")window.dispatchEvent(new Event("pocket:android-back"));});
applyTheme();
if (!pocketUpdateStartupCheckStarted) {
  pocketUpdateStartupCheckStarted = true;
  void checkPocketUpdates(true);
}
window.addEventListener("pocket:native-resume", () => {
  if (!pocketUpdateCheckBusy) void checkPocketUpdates(true);
});
// Playback starts after the authenticated Pocket splash, not while the app is
// still showing its first boot mark or login gate.
void playStartupSplash();
