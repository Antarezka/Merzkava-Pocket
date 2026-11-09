import {
  exportPocketEconomySnapshot,
  capturePocketEconomySaveForPlayerName,
  resetPocketEconomySaveForPlayerName,
  restorePocketEconomySaveForPlayerName
} from "./economy.js";
const native = window.PocketNative || null;

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

const show = value => {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

function parseMarkdownFields(markdown) {
  const fields = {};
  if (typeof markdown !== "string") return fields;
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*(.*?)\s*$/);
    if (match) fields[match[1].trim().replace(/:$/, "")] = match[2].trim().replace(/^\*\*(.*)\*\*$/, "$1");
  }
  return fields;
}

function listMarkup(items, emptyLabel) {
  if (!Array.isArray(items) || !items.length) return '<p class="player-record-empty">' + esc(emptyLabel) + '</p>';
  return '<ul class="player-record-list">' + items.slice(0,100).map(item => {
    if (typeof item === "string") return "<li>" + esc(item) + "</li>";
    if (!item || typeof item !== "object") return "";
    const label = item.name || item.itemName || item.title || item.buildingName || item.characterName || item.item_name || "Unnamed record";
    const meta = [item.level != null ? "Lv. " + item.level : "", item.quantity != null ? "×" + item.quantity : "", item.status || item.type || item.relation || ""].filter(Boolean).join(" · ");
    return '<li><span>' + esc(label) + "</span>" + (meta ? '<small>' + esc(meta) + "</small>" : "") + "</li>";
  }).join("") + "</ul>";
}

function recordMarkup(record, developer) {
  const fields = parseMarkdownFields(record.profileMarkdown || "");
  const character = record.character || record.apkCharacter || {};
  const economy = record.pocketEconomy || {};
  const assets = record.assets || {};
  const economyBuildings = Object.entries(economy.facilities || {}).map(([name, item]) => ({
    name, level:item?.level, status:item?.operational === false ? "inactive" : "built", family:item?.family || ""
  }));
  const buildings = Array.isArray(assets.buildings) && assets.buildings.length
    ? assets.buildings : economyBuildings;
  const buildingsRaw = assets.buildingsRaw || fields["Assets Bangunan"] || "";
  const relationshipData = record.relationships || economy.relationships || {};
  const relationshipEntries = Array.isArray(relationshipData) ? relationshipData : (relationshipData.entries || []);
  const disposition = relationshipData.disposition || record.disposition || null;
  const economyInventory = Object.entries(economy.inventory || {}).filter(([, quantity]) => Number(quantity) > 0)
    .map(([itemId, quantity]) => ({name:itemId,itemName:itemId,quantity}));
  const inventory = Array.isArray(record.inventory) && record.inventory.length
    ? record.inventory : (Array.isArray(record.inventoryItems) && record.inventoryItems.length ? record.inventoryItems : economyInventory);
  const wealth = record.wealth || record.wallet || {
    xc:economy.wallet_xc ?? null,
    xs:null,xg:null,zj:null,az:null,
    balances:{xc:economy.wallet_xc ?? null}
  };
  const gameplayProcesses = Array.isArray(economy.processes) ? economy.processes : [];
  const gameplaySaveMeta = economy.save_meta || {};
  const gameplayHomeRest = economy.home_rest || {};
  const gameplayVersion = record.pocketEconomySchemaVersion || economy.version || null;
  const walletText = fields["Wallet (wealth)"] || "";
  const walletRows = ["xc","xs","xg","zj","az"].map(code => {
    const amount = wealth[code] ?? wealth.balances?.[code];
    return '<div class="player-wallet-cell"><small>' + code.toUpperCase() + '</small><strong>' + esc(show(amount)) + "</strong></div>";
  }).join("");
  const daily = record.achievements?.dailyLogin || record.dailyLogin || {};
  const achievements = record.achievements?.items || record.achievements?.unlocked || record.achievementList || [];
  const source = typeof record.source === "string" ? record.source : (record.source?.app || record.source?.kind || "Pocket local gate");
  const imported = /apk/i.test(source) || record.profileStatus === "imported" || !!record.importedAt;
  const deviceFingerprint = record.deviceBinding?.publicKeySha256 || "";
  const deviceBound = !!deviceFingerprint || record.deviceBindingPresent === true;
  const savedGeneration = Number(record.savedSaveGeneration || 0);
  const savedAt = record.savedAt || 0;
  const status = imported ? "APK PROFILE IMPORTED" : record.profileStatus === "registered" ? "PLAYER PROFILE ACTIVE" : "NAME REGISTERED · PROFILE PENDING";
  const statusClass = imported ? "is-imported" : "is-pending";
  const lastSeen = record.lastSeenAt;
  const lastSeenLabel = typeof lastSeen === "number" ? new Date(lastSeen).toLocaleString() : show(lastSeen);
  const realm = character.realm ?? fields["Spirit Realm"] ?? fields.Realm;
  const age = character.age ?? fields.Usia;
  const origin = character.origin ?? fields.Asal;
  const relationshipSummary = disposition
    ? [disposition.label, disposition.lawfulnessBand, disposition.evidenceCount != null ? disposition.evidenceCount + " evidence" : ""].filter(Boolean).join(" · ")
    : relationshipData.summary || "";
  const relationshipCount = relationshipEntries.length || (relationshipData.bonds != null ? 1 : 0);
  const streak = daily.longestStreak ?? daily.longestConsecutiveStreak ?? daily.bestStreak;
  const currentStreak = daily.currentStreak ?? daily.streak;
  const longestDate = daily.longestStreakDate || daily.longestStreakEndedAt || "";
  const dailyStatus = [
    "Current: " + show(currentStreak),
    "Longest: " + (streak == null ? "Not recorded" : show(streak) + " days"),
    "Claims: " + show(daily.totalClaims),
    longestDate ? "Best streak date: " + longestDate : ""
  ].filter(Boolean).join(" · ");
  const background = character.background || fields["Latar Belakang"] || "Background not recorded in the imported profile.";
  const saveCode = typeof record.sessionSaveCode === "string" && record.sessionSaveCode.startsWith("MZKSV1.") && record.sessionSaveCode.length <= 6 * 1024 * 1024
    ? record.sessionSaveCode : "";
  const hasSaveCode = developer ? record.sessionSaveCodePresent === true : !!saveCode;
  const saveCodeMarkup = developer
    ? '<section class="player-record-section player-save-code-panel" data-player-save-code-panel data-player-name="' + esc(record.name || "") + '">' +
        '<h3>INCOMING SAVE CODE <small>' + (savedGeneration ? 'LAST SAVED · SESSION ' + esc(savedGeneration) : hasSaveCode ? 'WAITING FOR PLAYER CODE' : 'NO SAVE RECEIVED') + '</small></h3>' +
        '<textarea data-player-save-code-input rows="4" maxlength="6291456" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Paste the complete MZKSV1 save code from this Player…"></textarea>' +
        '<div class="player-save-code-actions"><button type="button" data-player-save-code-save>SAVE PLAYER DATA</button><small data-player-save-code-feedback role="status" aria-live="polite">' +
          (savedAt ? 'Last saved · ' + esc(typeof savedAt === "number" ? new Date(savedAt).toLocaleString() : savedAt) : 'A save code is required before this profile can be included in the update export.') + '</small></div>' +
      '</section>'
    : '<section class="player-record-section"><h3>MY SESSION SAVE CODE</h3><div class="player-save-code-field">' +
        '<input type="password" value="' + esc(saveCode) + '" data-player-session-save-code readonly autocomplete="off" spellcheck="false" aria-label="Current Player save code">' +
        '<button type="button" data-player-save-code-toggle aria-pressed="false">SHOW</button>' +
        '<button type="button" data-player-save-code-copy ' + (saveCode ? '' : 'disabled') + '>COPY</button>' +
      '</div><p class="player-record-note">Use this complete save snapshot when sending your data to Developer. It rotates after login and refreshes when this page packages your latest local economy save.</p>' +
      (saveCode ? '<small class="player-record-muted">Issued · ' + esc(typeof record.sessionSaveCodeIssuedAt === "number" ? new Date(record.sessionSaveCodeIssuedAt).toLocaleString() : show(record.sessionSaveCodeIssuedAt)) + ' · session ' + esc(show(record.sessionSaveGeneration)) + '</small>' :
        '<p class="player-record-empty">No session save code is available for this session.</p>') + '</section>';
  const resetMarkup = developer
    ? '<section class="player-record-section player-master-reset-panel" data-master-reset-panel data-player-name="' + esc(record.name || "") + '">' +
        '<h3>MASTER RESET <small>DEVELOPER ONLY</small></h3>' +
        '<p class="player-record-note">Generate a one-time code for this Player to start the Pocket game from the beginning. The code itself is shared privately; only its hash enters the next build manifest.</p>' +
        '<button type="button" data-master-reset-issue>GENERATE MASTER RESET CODE</button>' +
        '<textarea data-master-reset-output rows="2" readonly hidden spellcheck="false" aria-label="Player Master Reset code"></textarea>' +
        '<button type="button" data-master-reset-copy hidden>COPY RESET CODE</button>' +
        '<small data-master-reset-feedback class="player-record-feedback" role="status" aria-live="polite"></small>' +
      '</section>'
    : '<section class="player-record-section player-master-reset-panel">' +
        '<h3>RESET MY POCKET GAME</h3>' +
        '<p class="player-record-note">Enter the one-time Master Reset code sent to you by Developer. It works only in the Pocket build prepared for your Player profile. This resets game progress, not your Player name or login.</p>' +
        '<form data-player-master-reset-form>' +
          '<label for="player-master-reset-code">MASTER RESET CODE</label>' +
          '<input id="player-master-reset-code" data-player-master-reset-input type="text" maxlength="54" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MZK-R-…" required>' +
          '<button type="submit" data-player-master-reset-apply>RESET MY GAME</button>' +
          '<p data-player-master-reset-feedback class="player-record-feedback" role="status" aria-live="polite"></p>' +
        '</form>' +
      '</section>';

  return '<details class="player-record-card" ' + (developer ? "" : "open") + '>' +
    '<summary class="player-record-summary">' +
      '<span class="player-record-avatar" aria-hidden="true">' + esc(String(record.name || "?").trim().slice(0,1).toUpperCase()) + '</span>' +
      '<span class="player-record-summary-copy"><strong>' + esc(record.name || "Unknown") + '</strong><small>' + esc(show(realm)) + " · " + status + '</small></span>' +
      '<b class="player-record-chevron" aria-hidden="true">⌄</b>' +
    '</summary>' +
    '<div class="player-record-body">' +
      '<div class="player-record-status"><span class="' + statusClass + '">' + status + '</span><small>LAST LOGIN · ' + esc(lastSeenLabel) + '</small></div>' +
      '<section class="player-record-section"><h3>CHARACTER PROFILE</h3>' +
        '<div class="player-record-grid">' +
          '<div><small>NAME</small><strong>' + esc(record.name || "Unknown") + '</strong></div>' +
          '<div><small>AGE</small><strong>' + esc(show(age)) + '</strong></div>' +
          '<div><small>ORIGIN</small><strong>' + esc(show(origin)) + '</strong></div>' +
          '<div><small>SPIRIT REALM</small><strong>' + esc(show(realm)) + '</strong></div>' +
          '<div><small>AWAKENED</small><strong>' + esc(show(character.awakened ?? fields.Awakened)) + '</strong></div>' +
          '<div><small>LEVEL</small><strong>' + esc(show(character.cultivationLevel ?? character.level)) + '</strong></div>' +
        '</div><p class="player-record-note">' + esc(background) + '</p>' +
      '</section>' +
      '<section class="player-record-section"><h3>DEVICE BINDING</h3>' +
        '<div class="player-owner-proof-grid">' +
          '<div><small>REGISTERED DEVICE</small><strong class="' + (deviceBound ? 'is-ready' : 'is-pending') + '">' + (deviceBound ? 'BOUND · ' + esc(deviceFingerprint ? deviceFingerprint.slice(0,16) : 'THIS DEVICE') : 'NOT ENROLLED') + '</strong></div>' +
          '<div><small>KEY STORAGE</small><strong>' + esc(record.deviceBinding?.securityLevel || 'Pending first Player login') + '</strong></div>' +
        '</div>' +
        '' +
      '</section>' +
      saveCodeMarkup +
      resetMarkup +
      '<section class="player-record-section"><h3>BUILDING ASSETS <small>' + buildings.length + ' REGISTERED</small></h3>' +
        listMarkup(buildings, buildingsRaw || "No building assets recorded yet.") +
        (buildingsRaw && buildings.length ? '<p class="player-record-note">' + esc(buildingsRaw) + '</p>' : "") +
      '</section>' +
      '<section class="player-record-section"><h3>RELATIONSHIPS <small>' + relationshipCount + ' RECORD(S)</small></h3>' +
        (relationshipSummary ? '<p class="player-record-note">' + esc(relationshipSummary) + '</p>' : "") +
        listMarkup(relationshipEntries, relationshipData.bonds != null ? "Relationship bond score: " + relationshipData.bonds : "No relationship records imported yet.") +
      '</section>' +
      '<section class="player-record-section"><h3>INVENTORY <small>' + inventory.length + ' ITEM(S)</small></h3>' +
        listMarkup(inventory, "No inventory records imported yet.") +
      '</section>' +
      '<section class="player-record-section"><h3>WEALTH / CURRENCY</h3><div class="player-wallet-grid">' + walletRows + '</div>' +
        (walletText ? '<p class="player-record-note">' + esc(walletText) + '</p>' : "") +
        (Array.isArray(record.walletLedger) && record.walletLedger.length ? '<small class="player-record-muted">' + record.walletLedger.length + ' wallet ledger event(s) imported.</small>' : "") +
      '</section>' +
      '<section class="player-record-section"><h3>ACHIEVEMENTS <small>' + achievements.length + ' UNLOCKED</small></h3>' +
        listMarkup(achievements, "No achievement records imported yet.") +
        '<div class="player-daily-streak"><span>DAILY LOGIN · CONSECUTIVE STREAK</span><strong>' + esc(dailyStatus) + '</strong></div>' +
      '</section>' +
      '<section class="player-record-section"><h3>GAMEPLAY SESSION</h3>' +
        '<div class="player-record-grid">' +
          '<div><small>POCKET SAVE VERSION</small><strong>' + esc(show(gameplayVersion)) + '</strong></div>' +
          '<div><small>LAST ECONOMY SAVE</small><strong>' + esc(gameplaySaveMeta.updated_at ? new Date(gameplaySaveMeta.updated_at).toLocaleString() : "Not recorded") + '</strong></div>' +
          '<div><small>ACTIVE PROCESSES</small><strong>' + gameplayProcesses.filter(item => item?.status === "running").length + ' / ' + gameplayProcesses.length + '</strong></div>' +
          '<div><small>HOME REST</small><strong>' + esc(gameplayHomeRest.active ? "ACTIVE" : "INACTIVE") + '</strong></div>' +
          '<div><small>TRANSACTION LEDGER</small><strong>' + esc(String(Array.isArray(economy.ledger) ? economy.ledger.length : 0)) + ' RECORD(S)</strong></div>' +
          '<div><small>ECONOMY STATE</small><strong>' + esc(economy.format || "LOCAL SNAPSHOT") + '</strong></div>' +
        '</div>' +
        listMarkup(gameplayProcesses.slice(0,20), "No production or gameplay processes are currently recorded.") +
      '</section>' +
    '</div></details>';
}

export function playerRecordsMarkup(identity) {
  const developer = identity?.role === "developer";
  return '<main class="players-stage" data-player-records-stage data-player-role="' + (developer ? "developer" : "player") + '">' +
    '<header class="players-page-heading"><span class="eyebrow">POCKET ARCHIVE / PLAYER RECORDS</span><h1>Player <em>List.</em></h1>' +
    '<p>' + (developer ? "Local player registry and imported game records." : "Your own character record and personal progress.") + '</p></header>' +
    (developer ?
      '<section class="player-transfer-panel"><div class="player-record-section-head"><span>PLAYER DATA / UPDATE TRANSFER</span><small>DEVELOPER ONLY</small></div>' +
      '<p>Save codes contain compressed Player profile, game save, achievements and session data with a SHA-256 integrity check. They are structured data, not encryption: an update tool can decode and restore them. Master Reset hashes are included in the export for the next app build.</p>' +
      '<textarea data-player-import-input rows="5" spellcheck="false" autocapitalize="off" placeholder="Paste MERZKAVA_PLAYER_DATA_V1 JSON here…"></textarea>' +
      '<div class="player-transfer-actions"><button type="button" data-player-import>IMPORT APK DATA</button><button type="button" data-player-export>COPY ALL SAVED PLAYER DATA</button></div>' +
      '<textarea data-player-export-output rows="5" readonly hidden spellcheck="false" aria-label="All saved Player data export"></textarea>' +
      '<p class="player-record-note">Each Player opens their dropdown and shares the complete MZKSV1 snapshot. Paste it under the matching name and press SAVE. The header export includes validated saves plus the hash-only Master Reset manifest for the next APK build. Place its masterResetGrants array in review-apk/app/src/main/assets/player-master-reset-grants.json.</p>' +
      '<p class="player-record-feedback" data-player-transfer-message role="status" aria-live="polite"></p></section>' : "") +
    '<section class="player-record-directory"><div class="player-record-directory-head"><div><span class="eyebrow">' +
      (developer ? "ALL REGISTERED PLAYERS" : "PERSONAL PROFILE") + '</span><h2>' +
      (developer ? "Local Directory" : esc(identity?.displayName || "Player")) + '</h2></div>' +
      (developer ? '<button type="button" data-player-refresh>REFRESH</button>' : "") +
    '</div><p class="player-record-feedback" data-player-list-status role="status" aria-live="polite">Reading Pocket player records…</p>' +
    '<div class="player-record-listing" data-player-record-list></div></section></main>';
}

export function mountPlayerRecords(stage, identity, invokeNative) {
  if (!stage || !identity) return () => {};
  const developer = identity.role === "developer";
  const listing = stage.querySelector("[data-player-record-list]");
  const status = stage.querySelector("[data-player-list-status]");
  const transferMessage = stage.querySelector("[data-player-transfer-message]");
  const importInput = stage.querySelector("[data-player-import-input]");
  const importButton = stage.querySelector("[data-player-import]");
  const exportButton = stage.querySelector("[data-player-export]");
  const exportOutput = stage.querySelector("[data-player-export-output]");
  const refreshButton = stage.querySelector("[data-player-refresh]");
  const abort = new AbortController();
  let busy = false;
  let disposed = false;
  const authorized = () => {
    if (!native) return false;
    try {
      if (developer) return identity.role === "developer" && native.isDeveloperSessionAuthorized?.() === true;
      return identity.role === "player" && native.isPlayerSessionAuthorized?.() === true &&
        native.getActivePlayerSessionName?.() === identity.displayName;
    } catch { return false; }
  };
  const setStatus = message => { if (status) status.textContent = message; };
  const refreshPlayerSaveSnapshot = () => {
    if (developer || !authorized()) return;
    try {
      setStatus("Refreshing your full Pocket save: wallet, inventory, buildings, processes and session…");
      const snapshot = exportPocketEconomySnapshot(identity);
      const updated = JSON.parse(native.updatePocketPlayerEconomySnapshot?.(
        identity.displayName,
        JSON.stringify(snapshot)
      ) || "{}");
      if (!updated.ok) throw new Error(updated.error || "Pocket could not attach the local game save.");
      const freshCode = native.refreshCurrentPlayerSessionSaveCode?.() || "";
      if (!freshCode.startsWith("MZKSV1.")) throw new Error("Pocket could not create the refreshed full save code.");
      render();
      setStatus("Full save refreshed · " + updated.name + " · code session " + updated.session + ". Reveal or copy it below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not refresh the current Player save code.");
    }
  };
  const read = () => {
    if (!authorized()) throw new Error("The current account session is not authorized to read these records.");
    const records = JSON.parse(native.getPocketPlayerProfiles?.() || "[]");
    if (!Array.isArray(records)) throw new Error("Pocket returned an invalid player directory.");
    return developer ? records : records.filter(item => String(item.name || "").toLocaleLowerCase() === String(identity.displayName || "").toLocaleLowerCase());
  };
  const render = () => {
    if (disposed || !listing) return;
    try {
      const records = read();
      listing.innerHTML = records.length
        ? records.map(item => recordMarkup(item, developer)).join("")
        : '<div class="player-record-empty-card">No registered Player records are available for this session.</div>';
      setStatus(developer
        ? records.length + " player record(s) · Pocket local + imported APK data"
        : records.length ? "Verified session · displaying only your own player record." : "Your local profile record has not been initialized yet.");
    } catch (error) {
      listing.replaceChildren();
      setStatus(error instanceof Error ? error.message : "Player records are unavailable.");
    }
  };

  refreshButton?.addEventListener("click", async () => {
    if (!developer || !authorized() || busy) return;
    if (!navigator.onLine) { setStatus("Offline · showing Pocket-local records. Universe name refresh requires internet."); render(); return; }
    busy = true;
    refreshButton.disabled = true;
    setStatus("Checking the pinned Universe player registry…");
    try {
      await invokeNative("refreshPlayerRegistry", [], abort.signal);
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Registry refresh failed. Local records remain available.");
      render();
    } finally {
      busy = false;
      if (refreshButton.isConnected) refreshButton.disabled = false;
    }
  });

  importButton?.addEventListener("click", () => {
    if (!developer || !authorized() || busy) return;
    const raw = String(importInput?.value || "").trim();
    if (!raw) { if (transferMessage) transferMessage.textContent = "Paste the Merzkava APK transfer JSON first."; return; }
    try {
      const result = JSON.parse(native.importPocketPlayerProfiles?.(raw) || "{}");
      if (!result.ok) throw new Error(result.error || "Pocket rejected the transfer bundle.");
      if (transferMessage) transferMessage.textContent = result.imported + " player profile(s) imported · " + result.skipped + " skipped.";
      importInput.value = "";
      render();
    } catch (error) {
      if (transferMessage) transferMessage.textContent = error instanceof Error ? error.message : "Import failed. The existing directory was not changed.";
    }
  });

  exportButton?.addEventListener("click", async () => {
    if (!developer || !authorized()) return;
    try {
      const payload = native.exportPocketPlayerSaveDirectory?.() || "";
      if (!payload) throw new Error("The saved Player directory could not be exported.");
      const bundle = JSON.parse(payload);
      const players = Array.isArray(bundle.players) ? bundle.players : [];
      const grants = Array.isArray(bundle.masterResetGrants) ? bundle.masterResetGrants : [];
      if (!players.length && !grants.length) throw new Error("There are no validated Player saves or Master Reset grants to export yet.");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        if (exportOutput) exportOutput.hidden = true;
      } else {
        if (!exportOutput) throw new Error("Clipboard access is unavailable and the export field is missing.");
        exportOutput.value = payload;
        exportOutput.hidden = false;
        exportOutput.focus();
        exportOutput.select();
        throw new Error("The full save directory is shown below. Select and copy it manually.");
      }
      if (transferMessage) transferMessage.textContent =
        players.length + " validated Player save(s) and " + grants.length + " hash-only Master Reset grant(s) copied in MERZKAVA_POCKET_SAVE_DIRECTORY_V1 format.";
    } catch (error) {
      if (transferMessage) transferMessage.textContent = error instanceof Error ? error.message : "Could not copy saved Player data.";
    }
  });
  
  listing?.addEventListener("submit", event => {
    const form = event.target instanceof HTMLFormElement ? event.target.closest("[data-player-master-reset-form]") : null;
    if (!form || developer || !authorized()) return;
    event.preventDefault();
    const field = form.querySelector("[data-player-master-reset-input]");
    const feedback = form.querySelector("[data-player-master-reset-feedback]");
    const button = form.querySelector("[data-player-master-reset-apply]");
    const code = field instanceof HTMLInputElement ? field.value.trim().toUpperCase() : "";
    if (!/^MZK-R-[A-F0-9]{48}$/.test(code)) {
      if (feedback) feedback.textContent = "Enter the complete MZK-R Master Reset code.";
      return;
    }
    if (!native.validatePocketMasterResetCode?.(code)) {
      if (feedback) feedback.textContent = "This code is not valid for your Player in this installed build. Check that you installed the update prepared by Developer.";
      return;
    }
    if (!window.confirm("Reset only your Pocket game save? Your Player name and login registration will remain.")) return;
    if (button instanceof HTMLButtonElement) button.disabled = true;
    if (feedback) feedback.textContent = "Resetting your local Pocket game and saved Player snapshot…";
    let localBackup = [];
    try {
      localBackup = capturePocketEconomySaveForPlayerName(identity.displayName);
      const removed = resetPocketEconomySaveForPlayerName(identity.displayName);
      const result = JSON.parse(native.redeemPocketMasterResetCode?.(code) || "{}");
      if (!result.ok) throw new Error(result.error || "Pocket Master Reset could not be completed.");
      if (field instanceof HTMLInputElement) field.value = "";
      refreshPlayerSaveSnapshot();
      render();
      const notice = stage.querySelector("[data-player-list-status]");
      if (notice) notice.textContent = "MASTER RESET COMPLETE · " + identity.displayName + " · local game save records cleared: " + removed + ". Your Player account remains active.";
    } catch (error) {
      try {
        if (localBackup.length) restorePocketEconomySaveForPlayerName(identity.displayName, localBackup);
      } catch (restoreError) {
        if (feedback) feedback.textContent = (error instanceof Error ? error.message : "Master Reset failed.") +
          " Local save rollback also failed: " + (restoreError instanceof Error ? restoreError.message : "storage error") + ". Contact Developer before retrying.";
        return;
      }
      if (feedback) feedback.textContent = error instanceof Error ? error.message : "Master Reset failed. Contact Developer before retrying.";
    } finally {
      if (button instanceof HTMLButtonElement && button.isConnected) button.disabled = false;
    }
  });

  listing?.addEventListener("click", async event => {
    const issueButton = event.target instanceof Element ? event.target.closest("[data-master-reset-issue]") : null;
    if (issueButton && developer && authorized()) {
      const panel = issueButton.closest("[data-master-reset-panel]");
      const name = panel?.getAttribute("data-player-name") || "";
      const output = panel?.querySelector("[data-master-reset-output]");
      const copy = panel?.querySelector("[data-master-reset-copy]");
      const feedback = panel?.querySelector("[data-master-reset-feedback]");
      if (!name || !(output instanceof HTMLTextAreaElement)) return;
      issueButton.disabled = true;
      try {
        const result = JSON.parse(native.createPocketMasterResetGrant?.(name) || "{}");
        if (!result.ok || !/^MZK-R-[A-F0-9]{48}$/.test(result.code || "")) {
          throw new Error(result.error || "Pocket could not issue a valid Master Reset code.");
        }
        output.value = result.code;
        output.hidden = false;
        if (copy instanceof HTMLButtonElement) copy.hidden = false;
        if (feedback) feedback.textContent = "ONE-TIME CODE ISSUED · expected save epoch " + result.expectedSaveEpoch + ". Send this code privately and include the updated masterResetGrants manifest in the next APK build.";
      } catch (error) {
        if (feedback) feedback.textContent = error instanceof Error ? error.message : "Could not issue the Master Reset code.";
      } finally {
        issueButton.disabled = false;
      }
      return;
    }

    const copyReset = event.target instanceof Element ? event.target.closest("[data-master-reset-copy]") : null;
    if (copyReset && developer && authorized()) {
      const panel = copyReset.closest("[data-master-reset-panel]");
      const output = panel?.querySelector("[data-master-reset-output]");
      const feedback = panel?.querySelector("[data-master-reset-feedback]");
      const code = output instanceof HTMLTextAreaElement ? output.value : "";
      if (!code) return;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
        else {
          if (!(output instanceof HTMLTextAreaElement)) throw new Error("Reset code field is unavailable.");
          output.focus(); output.select();
          if (!document.execCommand("copy")) throw new Error("Clipboard is unavailable.");
        }
        if (feedback) feedback.textContent = "Master Reset code copied. Share it privately with " + (panel?.getAttribute("data-player-name") || "the Player") + ".";
      } catch (error) {
        if (feedback) feedback.textContent = error instanceof Error ? error.message : "Could not copy Master Reset code.";
      }
      return;
    }

    const saveButton = event.target instanceof Element ? event.target.closest("[data-player-save-code-save]") : null;
    if (saveButton && developer && authorized()) {
      const panel = saveButton.closest("[data-player-save-code-panel]");
      const name = panel?.getAttribute("data-player-name") || "";
      const field = panel?.querySelector("[data-player-save-code-input]");
      const feedback = panel?.querySelector("[data-player-save-code-feedback]");
      const supplied = field instanceof HTMLTextAreaElement ? field.value.trim() : "";
      if (!name || !supplied) { if (feedback) feedback.textContent = "Choose the Player and paste the complete MZKSV1 save code."; return; }
      saveButton.disabled = true;
      if (feedback) feedback.textContent = "Validating Player identity, session, reset epoch and checksum…";
      try {
        const result = JSON.parse(native.savePocketPlayerCodeForName?.(name, supplied) || "{}");
        if (!result.ok) throw new Error(result.error || "Pocket rejected this save code.");
        if (field instanceof HTMLTextAreaElement) field.value = "";
        if (feedback) feedback.textContent = "SAVED · session " + result.session + " · " + new Date(result.savedAt).toLocaleString();
        setStatus("Player save accepted for " + name + ". The profile is ready for the next update export.");
        render();
      } catch (error) {
        if (feedback) feedback.textContent = error instanceof Error ? error.message : "Save failed. Existing Player data was not replaced.";
      } finally {
        if (saveButton.isConnected) saveButton.disabled = false;
      }
      return;
    }

    const toggle = event.target instanceof Element ? event.target.closest("[data-player-save-code-toggle]") : null;
    if (toggle && !developer && authorized()) {
      const field = listing.querySelector("[data-player-session-save-code]");
      if (field instanceof HTMLInputElement) {
        const reveal = field.type === "password";
        field.type = reveal ? "text" : "password";
        toggle.textContent = reveal ? "HIDE" : "SHOW";
        toggle.setAttribute("aria-pressed", String(reveal));
      }
      return;
    }

    const copyCode = event.target instanceof Element ? event.target.closest("[data-player-save-code-copy]") : null;
    if (copyCode && !developer && authorized()) {
      const field = listing.querySelector("[data-player-session-save-code]");
      const code = field instanceof HTMLInputElement ? field.value : "";
      if (!code.startsWith("MZKSV1.") || code.length > 6 * 1024 * 1024) return;
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
        else {
          const fallback = document.createElement("textarea");
          fallback.value = code; fallback.setAttribute("readonly", "");
          fallback.style.position = "fixed"; fallback.style.opacity = "0";
          document.body.append(fallback); fallback.select();
          const copied = document.execCommand("copy"); fallback.remove();
          if (!copied) throw new Error("Clipboard is unavailable.");
        }
        if (status) status.textContent = "Complete session save code copied. It changes after your next successful login.";
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : "Could not copy session save code.";
      }
      return;
    }
  });

  render();
  if (!developer) refreshPlayerSaveSnapshot();
  if (developer && navigator.onLine && refreshButton) refreshButton.click();
  return () => { disposed = true; abort.abort(); };
}
