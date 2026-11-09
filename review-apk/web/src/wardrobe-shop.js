function copyAppearance(value) {
  return {
    hair: value.hair,
    outfit: value.outfit,
    accessory: value.accessory,
    weapon: value.weapon
  };
}

/**
 * Keeps wardrobe previews in memory until one explicit confirmation commits
 * all four appearance slots in a single save operation.
 */
export function createWardrobeShopTransaction({ readAppearance, previewAppearance, saveAppearance }) {
  if (typeof readAppearance !== "function" || typeof previewAppearance !== "function" || typeof saveAppearance !== "function") {
    throw new TypeError("Wardrobe shop requires read, preview and save functions.");
  }

  let original = null;
  let draft = null;
  let lastApplied = null;
  let previewQueue = Promise.resolve();
  let previewRevision = 0;
  let previewError = null;
  let confirmationPending = false;
  let closingPromise = null;
  let committing = false;

  const isOpen = () => original !== null;

  const clear = () => {
    original = null;
    draft = null;
    lastApplied = null;
    previewError = null;
    confirmationPending = false;
    previewRevision += 1;
  };

  return {
    open() {
      if (isOpen()) return true;
      original = copyAppearance(readAppearance());
      draft = copyAppearance(original);
      lastApplied = copyAppearance(original);
      previewError = null;
      confirmationPending = false;
      closingPromise = null;
      committing = false;
      previewQueue = Promise.resolve();
      return true;
    },

    isOpen,

    getDraft() {
      return draft ? copyAppearance(draft) : null;
    },

    getOriginal() {
      return original ? copyAppearance(original) : null;
    },

    isConfirmPending() {
      return confirmationPending;
    },

    select(nextAppearance) {
      if (!isOpen() || closingPromise || committing) {
        return Promise.resolve({ ok: false, latest: false });
      }

      const selected = copyAppearance(nextAppearance);
      draft = selected;
      confirmationPending = false;
      previewError = null;
      const revision = ++previewRevision;

      const job = previewQueue.catch(() => undefined).then(async () => {
        if (!isOpen() || closingPromise) return false;
        await previewAppearance(copyAppearance(selected));
        lastApplied = copyAppearance(selected);
        if (revision === previewRevision) previewError = null;
        return true;
      }).catch(error => {
        if (revision === previewRevision) {
          draft = copyAppearance(lastApplied);
          previewError = error;
        }
        throw error;
      });

      previewQueue = job;
      return job.then(
        () => ({ ok: true, latest: revision === previewRevision }),
        error => ({ ok: false, latest: revision === previewRevision, error })
      );
    },

    requestConfirmation() {
      if (!isOpen() || closingPromise || committing) return false;
      confirmationPending = true;
      return true;
    },

    cancelConfirmation() {
      if (!isOpen() || closingPromise || committing) return false;
      confirmationPending = false;
      return true;
    },

    async confirm() {
      if (!isOpen() || !confirmationPending || closingPromise || committing) return false;
      committing = true;
      try {
        await previewQueue;
        if (previewError || !draft) return false;
        const saved = await saveAppearance(copyAppearance(draft));
        if (saved !== true) return false;
        clear();
        return true;
      } catch {
        return false;
      } finally {
        committing = false;
      }
    },

    exit() {
      if (closingPromise) return closingPromise;
      if (!isOpen() || committing) return Promise.resolve(false);

      const rollback = copyAppearance(original);
      closingPromise = (async () => {
        let restored = false;
        try {
          await previewQueue.catch(() => undefined);
          await previewAppearance(copyAppearance(rollback));
          restored = true;
          return true;
        } catch {
          return false;
        } finally {
          if (restored) clear();
          closingPromise = null;
        }
      })();
      return closingPromise;
    },

    abandon() {
      // Used only when the entire scene is being destroyed. No preview was saved.
      clear();
      closingPromise = null;
      committing = false;
    }
  };
}
