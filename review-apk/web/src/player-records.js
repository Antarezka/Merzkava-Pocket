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
  const assets = record.assets || {};
  const buildings = Array.isArray(assets.buildings) ? assets.buildings : [];
  const buildingsRaw = assets.buildingsRaw || fields["Assets Bangunan"] || "";
  const relationshipData = record.relationships || {};
  const relationshipEntries = Array.isArray(relationshipData) ? relationshipData : (relationshipData.entries || []);
  const disposition = relationshipData.disposition || record.disposition || null;
  const inventory = Array.isArray(record.inventory) ? record.inventory : (record.inventoryItems || []);
  const wealth = record.wealth || record.wallet || {};
  const walletText = fields["Wallet (wealth)"] || "";
  const walletRows = ["xc","xs","xg","zj","az"].map(code => {
    const amount = wealth[code] ?? wealth.balances?.[code];
    return '<div class="player-wallet-cell"><small>' + code.toUpperCase() + '</small><strong>' + esc(show(amount)) + "</strong></div>";
  }).join("");
  const daily = record.achievements?.dailyLogin || record.dailyLogin || {};
  const achievements = record.achievements?.items || record.achievements?.unlocked || record.achievementList || [];
  const source = typeof record.source === "string" ? record.source : (record.source?.app || record.source?.kind || "Pocket local gate");
  const imported = /apk/i.test(source) || record.profileStatus === "imported" || !!record.importedAt;
  const ownerReady = record.ownerCredentialPresent === true || (!!record.ownerCredential?.salt && !!record.ownerCredential?.hash && [310000,600000].includes(Number(record.ownerCredential?.iterations)));
  const deviceFingerprint = record.deviceBinding?.publicKeySha256 || "";
  const passwordMask = ownerReady ? "••••••••••••" : "NOT REGISTERED";
  const deviceBound = !!deviceFingerprint || record.deviceBindingPresent === true;
  const status = imported ? "APK PROFILE IMPORTED" : ownerReady ? "PLAYER ACCOUNT ACTIVE" : "NAME REGISTERED · PROFILE PENDING";
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
  const saveCode = typeof record.sessionSaveCode === "string" && /^MZK-S-[A-F0-9]{32}$/.test(record.sessionSaveCode)
    ? record.sessionSaveCode : "";
  const hasSaveCode = developer ? record.sessionSaveCodePresent === true : !!saveCode;
  const saveCodeMarkup = developer
    ? '<section class="player-record-section"><h3>PLAYER SAVE CODE</h3><div class="player-save-code-field is-developer"><strong>' +
        (hasSaveCode ? '••••••••••••' : 'NOT ISSUED') + '</strong><small>Player-only code · rotates on every successful login' +
        (record.sessionSaveCodeGeneration ? ' · session ' + esc(record.sessionSaveCodeGeneration) : '') + '</small></div></section>'
    : '<section class="player-record-section"><h3>MY SESSION SAVE CODE</h3><div class="player-save-code-field">' +
        '<input type="password" value="' + esc(saveCode) + '" data-player-session-save-code readonly autocomplete="off" spellcheck="false" aria-label="Current Player save code">' +
        '<button type="button" data-player-save-code-toggle aria-pressed="false">SHOW</button>' +
        '<button type="button" data-player-save-code-copy ' + (saveCode ? '' : 'disabled') + '>COPY</button>' +
      '</div><p class="player-record-note">Use this code when sending your save data to Developer. It changes after your next successful login; the previous code will no longer be accepted.</p>' +
      (saveCode ? '<small class="player-record-muted">Issued · ' + esc(typeof record.sessionSaveCodeIssuedAt === "number" ? new Date(record.sessionSaveCodeIssuedAt).toLocaleString() : show(record.sessionSaveCodeIssuedAt)) + ' · session ' + esc(show(record.sessionSaveGeneration)) + '</small>' :
        '<p class="player-record-empty">No session save code is available for this session.</p>') + '</section>';

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
      '<section class="player-record-section"><h3>ACCOUNT OWNER PROOF</h3>' +
        '<div class="player-owner-proof-grid">' +
          '<div><small>PLAYER PASSWORD</small><strong class="' + (ownerReady ? 'is-ready' : 'is-pending') + '">' + passwordMask + '</strong><small>PBKDF2 verifier · no plain-text password</small></div>' +
          '<div><small>DEVICE KEY</small><strong class="' + (deviceBound ? 'is-ready' : 'is-pending') + '">' + (deviceBound ? 'BOUND · ' + esc(deviceFingerprint ? deviceFingerprint.slice(0,16) : 'THIS DEVICE') : 'NOT ENROLLED') + '</strong></div>' +
          '<div><small>KEY STORAGE</small><strong>' + esc(record.deviceBinding?.securityLevel || 'Pending first owner login') + '</strong></div>' +
        '</div>' +
        (developer ? '<button type="button" class="player-rebind-button" data-player-reset-device="' + esc(record.name || '') + '">RESET DEVICE BINDING</button>' : '') +
      '</section>' +
      saveCodeMarkup +
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
    '</div></details>';
}

export function playerRecordsMarkup(identity) {
  const developer = identity?.role === "developer";
  return '<main class="players-stage" data-player-records-stage data-player-role="' + (developer ? "developer" : "player") + '">' +
    '<header class="players-page-heading"><span class="eyebrow">POCKET ARCHIVE / PLAYER RECORDS</span><h1>Player <em>List.</em></h1>' +
    '<p>' + (developer ? "Local player registry and imported game records." : "Your own character record and personal progress.") + '</p></header>' +
    (developer ?
      '<section class="player-transfer-panel"><div class="player-record-section-head"><span>PLAYER DATA / UPDATE TRANSFER</span><small>DEVELOPER ONLY</small></div>' +
      '<p>Import a MERZKAVA_PLAYER_DATA_V1 bundle from Merzkava APK, or copy the Pocket update bundle. Passwords are not exported in plain text; only salted PBKDF2 verifiers are included.</p>' +
      '<textarea data-player-import-input rows="5" spellcheck="false" autocapitalize="off" placeholder="Paste MERZKAVA_PLAYER_DATA_V1 JSON here…"></textarea>' +
      '<div class="player-transfer-actions"><button type="button" data-player-import>IMPORT APK DATA</button><button type="button" data-player-export>COPY POCKET DATA</button></div>' +
      '<div class="player-save-lookup"><label for="player-save-lookup-input">INCOMING PLAYER SAVE CODE</label>' +
        '<input id="player-save-lookup-input" data-player-save-lookup-input type="text" maxlength="38" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MZK-S-…">' +
        '<button type="button" data-player-save-lookup>VERIFY SAVE OWNER</button>' +
        '<p class="player-record-feedback" data-player-save-lookup-result role="status" aria-live="polite"></p></div>' +
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
  const refreshButton = stage.querySelector("[data-player-refresh]");
  const saveCodeLookupInput = stage.querySelector("[data-player-save-lookup-input]");
  const saveCodeLookupButton = stage.querySelector("[data-player-save-lookup]");
  const saveCodeLookupResult = stage.querySelector("[data-player-save-lookup-result]");
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
      const payload = native.exportPocketPlayerProfiles?.() || "";
      if (!payload) throw new Error("Developer-only update export is unavailable.");
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload);
      else {
        importInput.value = payload;
        importInput.focus();
        importInput.select();
        throw new Error("Clipboard access is unavailable. Pocket data was placed in the transfer field for manual copying.");
      }
      if (transferMessage) transferMessage.textContent = "Update bundle copied. It contains salted password verifiers, not original passwords.";
    } catch (error) {
      if (transferMessage) transferMessage.textContent = error instanceof Error ? error.message : "Could not copy Pocket data.";
    }
  });
  
  saveCodeLookupButton?.addEventListener("click", () => {
    if (!developer || !authorized()) return;
    const supplied = String(saveCodeLookupInput?.value || "").trim().toUpperCase();
    if (!/^MZK-S-[A-F0-9]{32}$/.test(supplied)) {
      if (saveCodeLookupResult) saveCodeLookupResult.textContent = "Enter the complete current MZK-S session save code.";
      return;
    }
    try {
      const found = JSON.parse(native.lookupPocketPlayerBySessionSaveCode?.(supplied) || "{}");
      if (!found.ok) throw new Error(found.error || "Save code was not accepted.");
      if (saveCodeLookupResult) saveCodeLookupResult.textContent =
        "VALID · " + found.name + " · session " + found.session + " · " +
        (found.issuedAt ? new Date(found.issuedAt).toLocaleString() : "issue time unavailable");
      if (saveCodeLookupInput) saveCodeLookupInput.value = "";
    } catch (error) {
      if (saveCodeLookupResult) saveCodeLookupResult.textContent =
        error instanceof Error ? error.message : "Could not verify this Player save code.";
    }
  });

  listing?.addEventListener("click", async event => {
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
      if (!/^MZK-S-[A-F0-9]{32}$/.test(code)) return;
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
        if (status) status.textContent = "Current session save code copied. It will be replaced after your next successful login.";
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : "Could not copy session save code.";
      }
      return;
    }

    const target = event.target instanceof Element ? event.target.closest("[data-player-reset-device]") : null;
    if (!target || !developer || !authorized()) return;
    const name = target.getAttribute("data-player-reset-device") || "";
    if (!name || !window.confirm("Reset the Pocket device binding for " + name + "? The player will need their Player account password to pair the next device.")) return;
    const ok = native.resetPocketPlayerDeviceBinding?.(name) === true;
    if (transferMessage) transferMessage.textContent = ok
      ? "Device binding reset for " + name + ". The next successful owner login can enroll a device."
      : "Pocket could not reset that device binding.";
    render();
  });

  render();
  if (developer && navigator.onLine && refreshButton) {
    // Opening the Developer directory refreshes the pinned Universe list automatically.
    // The cached local directory remains readable offline.
    refreshButton.click();
  }
  return () => { disposed = true; abort.abort(); };
}
