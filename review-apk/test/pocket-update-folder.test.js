import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const activity = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/MainActivity.java", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketNativeBridge.java", import.meta.url), "utf8");
const storage = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketUpdateStorage.java", import.meta.url), "utf8");
const service = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketUpdateProgressService.java", import.meta.url), "utf8");
const installedReceiver = readFileSync(new URL("../app/src/main/java/com/merzkava/pocket/review/PocketUpdateInstalledReceiver.java", import.meta.url), "utf8");
const main = readFileSync(new URL("../web/src/main.js", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../app/src/main/AndroidManifest.xml", import.meta.url), "utf8");

test("The updater asks the user to select a folder and keeps only that SAF permission", () => {
  assert.match(activity, /Intent\.ACTION_OPEN_DOCUMENT_TREE/);
  assert.match(activity, /FLAG_GRANT_PERSISTABLE_URI_PERMISSION/);
  assert.match(activity, /REQUEST_POCKET_UPDATE_FOLDER/);
  assert.match(activity, /nativeBridge\.setPocketUpdateFolder/);
  assert.match(bridge, /takePersistableUriPermission\(treeUri, persistedFlags\)/);
  assert.match(storage, /FOLDER_NAME = "Merzkava Pocket"/);
  assert.match(storage, /createDocument\(resolver, rootDocument/);
  assert.doesNotMatch(manifest, /MANAGE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE/);
});

test("The updater exposes the selected path and asks before opening a file manager or removing APKs", () => {
  assert.match(bridge, /Intent\.createChooser\(view, "Choose a file manager"\)/);
  assert.match(bridge, /new AlertDialog\.Builder\(activity\)/);
  assert.match(bridge, /setNegativeButton\("CANCEL"/);
  assert.match(bridge, /setPositiveButton\("REMOVE APK"/);
  assert.match(bridge, /getExternalFilesDir\(Environment\.DIRECTORY_DOWNLOADS\)/);
  assert.match(main, /data-update-storage-path/);
  assert.match(main, /data-update-folder-choose/);
  assert.match(main, /data-update-folder-open/);
  assert.match(main, /data-update-file-remove/);
});

test("DownloadManager is only the resumable staging download; final APK is copied and SHA-verified in the selected folder", () => {
  assert.match(bridge, /request\.setDestinationInExternalFilesDir\(activity, Environment\.DIRECTORY_DOWNLOADS, fileName\)/);
  assert.match(service, /PocketUpdateStorage\.copyAndVerify\(\s*this, staging, folder, fileName, sha256\)/);
  assert.match(storage, /DocumentsContract\.createDocument\(/);
  assert.match(storage, /MessageDigest\.getInstance\("SHA-256"\)/);
  assert.match(storage, /expectedSha256\.equalsIgnoreCase\(actual\.toString\(\)\)/);
  assert.match(service, /PocketUpdateStorage\.PREF_SAVED_URI/);
  assert.match(service, /downloads\.remove\(downloadId\)/);
});

test("Deleting or moving the final APK invalidates completed status and the Settings panel keeps checking it", () => {
  assert.match(bridge, /PocketUpdateStorage\.exists\(activity, savedUri\)/);
  assert.match(bridge, /putString\(PocketUpdateStorage\.PREF_STATUS, "missing"\)/);
  assert.match(bridge, /The APK was removed or moved in your file manager/);
  assert.match(main, /\["queued","downloading","paused","copying","completed"\]/);
  assert.match(main, /state\.status==="missing"\?"DOWNLOAD AGAIN"/);
  assert.match(main, /pocket:update-file-changed/);
});

test("APK cleanup touches only Pocket updater filenames, never unrelated folder contents", () => {
  assert.match(storage, /Merzkava-Pocket-Build-/);
  assert.match(storage, /buildNumberFromName/);
  assert.match(storage, /removePocketApksAtOrBelow/);
  assert.match(installedReceiver, /PocketUpdateStorage\.removePocketApksAtOrBelow/);
  assert.match(storage, /if \(build > 0 && build != keepBuildNumber\)/);
});
