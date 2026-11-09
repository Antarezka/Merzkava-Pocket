import test from "node:test";
import assert from "node:assert/strict";
import { createWardrobeShopTransaction } from "../web/src/wardrobe-shop.js";

const appearance = (hair = "long_black", outfit = "black_hanfu", accessory = "none", weapon = "none") => ({
  hair, outfit, accessory, weapon
});

function makeShop({ saveResult = true, preview } = {}) {
  let persisted = appearance();
  let displayed = appearance();
  const saves = [];
  const previews = [];
  const shop = createWardrobeShopTransaction({
    readAppearance: () => persisted,
    previewAppearance: async next => {
      previews.push({ ...next });
      if (preview) await preview(next);
      displayed = { ...next };
    },
    saveAppearance: async next => {
      saves.push({ ...next });
      if (typeof saveResult === "function") {
        const result = await saveResult(next);
        if (result === true) persisted = { ...next };
        return result;
      }
      if (saveResult === true) persisted = { ...next };
      return saveResult;
    }
  });
  return {
    shop,
    saves,
    previews,
    get persisted() { return { ...persisted }; },
    get displayed() { return { ...displayed }; }
  };
}

test("item selection previews only; storage changes only after confirmed purchase", async () => {
  const h = makeShop();
  h.shop.open();
  const selected = appearance("braided_crown", "ivory_layers", "round_glasses", "closed_umbrella");
  assert.deepEqual(await h.shop.select(selected), { ok: true, latest: true });
  assert.deepEqual(h.displayed, selected);
  assert.deepEqual(h.persisted, appearance());
  assert.equal(h.saves.length, 0);

  h.shop.requestConfirmation();
  assert.equal(await h.shop.confirm(), true);
  assert.deepEqual(h.persisted, selected);
  assert.equal(h.saves.length, 1);
  assert.equal(h.shop.isOpen(), false);
});

test("exit restores the original appearance without saving the draft", async () => {
  const h = makeShop();
  h.shop.open();
  await h.shop.select(appearance("low_chignon", "iron_guard", "jade_pin", "straight_sword"));
  assert.equal(await h.shop.exit(), true);
  assert.deepEqual(h.displayed, appearance());
  assert.deepEqual(h.persisted, appearance());
  assert.equal(h.saves.length, 0);
  assert.equal(h.shop.isOpen(), false);
});

test("duplicate exit calls share one rollback and one restore operation", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = makeShop({ preview: async next => {
    if (next.hair === "long_black") await gate;
  } });
  h.shop.open();
  await h.shop.select(appearance("braided_crown"));
  const before = h.previews.length;
  const first = h.shop.exit();
  const second = h.shop.exit();
  assert.equal(first, second);
  await Promise.resolve();
  release();
  assert.equal(await first, true);
  assert.equal(h.previews.length, before + 1);
  assert.deepEqual(h.displayed, appearance());
});

test("rapid selections are previewed in order and the newest draft is committed", async () => {
  let releaseFirst;
  const firstGate = new Promise(resolve => { releaseFirst = resolve; });
  const h = makeShop({ preview: async next => {
    if (next.hair === "braided_crown") await firstGate;
  } });
  h.shop.open();
  const first = h.shop.select(appearance("braided_crown", "ivory_layers"));
  const second = h.shop.select(appearance("low_chignon", "jade_scholar"));
  assert.equal(h.previews.length, 0);
  releaseFirst();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, { ok: true, latest: false });
  assert.deepEqual(b, { ok: true, latest: true });
  assert.equal(h.previews.length, 2);
  assert.deepEqual(h.displayed, appearance("low_chignon", "jade_scholar"));
  h.shop.requestConfirmation();
  assert.equal(await h.shop.confirm(), true);
  assert.deepEqual(h.persisted, appearance("low_chignon", "jade_scholar"));
});

test("canceling the confirmation leaves the draft open and unsaved", async () => {
  const h = makeShop();
  h.shop.open();
  await h.shop.select(appearance("soft_bob", "rose_ceremony"));
  h.shop.requestConfirmation();
  assert.equal(h.shop.isConfirmPending(), true);
  h.shop.cancelConfirmation();
  assert.equal(h.shop.isConfirmPending(), false);
  assert.equal(h.shop.isOpen(), true);
  assert.deepEqual(h.persisted, appearance());
  assert.equal(h.saves.length, 0);
});

test("failed save keeps the shop open so confirmation can be retried", async () => {
  let allowSave = false;
  const h = makeShop({ saveResult: async next => {
    if (!allowSave) return false;
    return true;
  } });
  h.shop.open();
  const selected = appearance("twin_braids", "moon_priest", "moon_veil", "jade_staff");
  await h.shop.select(selected);
  h.shop.requestConfirmation();
  assert.equal(await h.shop.confirm(), false);
  assert.equal(h.shop.isOpen(), true);
  assert.deepEqual(h.persisted, appearance());
  allowSave = true;
  assert.equal(await h.shop.confirm(), true);
  assert.deepEqual(h.persisted, selected);
});

test("a failed rollback leaves the shop open for a safe retry", async () => {
  let failRestore = true;
  const h = makeShop({ preview: async next => {
    if (next.hair === "long_black" && failRestore) throw new Error("temporary asset failure");
  } });
  h.shop.open();
  await h.shop.select(appearance("high_tie", "crimson_sect"));
  assert.equal(await h.shop.exit(), false);
  assert.equal(h.shop.isOpen(), true);
  failRestore = false;
  assert.equal(await h.shop.exit(), true);
  assert.equal(h.shop.isOpen(), false);
  assert.deepEqual(h.displayed, appearance());
});
