package com.merzkava.pocket.review;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.StatFs;
import android.provider.Settings;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.InflaterInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.MessageDigest;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;

public final class PocketNativeBridge {
    private static final int ITERATIONS = 600000;
    private static final String ID_SALT = "zki1bXl9Kc9FkzTBCvsoSQ==";
    private static final String ID_VERIFIER = "rWliJ21UojOkc2FX4QQXudntYW7NuuKB9kizB4Ih0sA=";
    private static final String PASSWORD_SALT = "0Wnvcfd3cGISdPZSyJfQZQ==";
    private static final String PASSWORD_VERIFIER = "rYGmwsLKK3El0UXvA3vyj+pe7d7uj0xJchixuRgr/IU=";

    private static final String PREFS = "merzkava-pocket-access";
    private static final String KEY_ALIAS = "merzkava-pocket-developer-remember-v1";
    private static final String PREF_CREDENTIALS = "developer_credentials_cipher";
    private static final String PREF_IV = "developer_credentials_iv";
    private static final String PREF_SESSION = "developer_session_authorized";
    private static final String PREF_LOCAL_PLAYERS = "verified_local_player_profiles_v1";
    private static final String PREF_POCKET_PLAYERS = "registered_pocket_player_profiles_v1";
    private static final String PREF_PLAYER_PROFILES = "pocket_player_game_profiles_v1";
    private static final String PREF_PLAYER_PROFILES_IV = "pocket_player_game_profiles_iv_v1";
    private static final String PREF_REGISTRY_SHA = "pocket_latest_registry_sha";
    private static final String PREF_REGISTRY_AT = "pocket_latest_registry_verified_at";
    private static final String PREF_PLAYER_SESSION_NAME = "active_verified_player_name";
    private static final String PREF_USED_MASTER_RESET_GRANTS = "pocket_used_master_reset_grants_v1";
    private static final String PREF_UPDATE_DOWNLOAD_ID = "pocket_update_download_id_v1";
    private static final String PREF_UPDATE_SHA256 = "pocket_update_sha256_v1";
    static final String PREF_UPDATE_FILE_NAME = "pocket_update_file_name_v1";
    static final String PREF_UPDATE_BUILD_NUMBER = "pocket_update_build_number_v1";
    private static final String PREF_UPDATE_NOTIFIED_BUILD = "pocket_update_notified_build_v1";
    private static final String PREF_UPDATE_URL = "pocket_update_download_url_v1";
    private static final String PREF_UPDATE_NOTIFICATION_THEME = "pocket_update_notification_theme_v1";
    private static final String PREF_CUSTOM_MUSIC_LIBRARY = "pocket_custom_music_library_v1";
    private static final long MAX_CUSTOM_MUSIC_BYTES = 64L * 1024L * 1024L;
    private static final String UPDATE_NOTIFICATION_CHANNEL_ID = "merzkava-pocket-updates";
    private static final int UPDATE_NOTIFICATION_ID = 8202;
    private static final String UNIVERSE = "Antarezka/merzkava-universe";

    private final Activity activity;
    private final WebView webView;
    private final Set<String> cancelledRequests = ConcurrentHashMap.newKeySet();
    private volatile String lastIv = "";
    private final PocketCriAudioRuntime criAudio;

    PocketNativeBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.criAudio = new PocketCriAudioRuntime(activity, webView);
        this.criAudio.initialize();
    }

    @JavascriptInterface public boolean isNative() { return true; }

    @JavascriptInterface public boolean openPocketAudioPicker() {
        if (!(activity instanceof MainActivity)) return false;
        activity.runOnUiThread(() -> ((MainActivity) activity).openPocketAudioPicker());
        return true;
    }

    // Single CRI command surface for every application-layer audio request.
    @JavascriptInterface public boolean criPlayTrack(String trackId) {
        return criAudio.playTrack(trackId);
    }

    @JavascriptInterface public boolean criPrewarmMusicLibrary(String selectedTrackId) {
        return criAudio.prewarmMusicLibrary(selectedTrackId);
    }

    @JavascriptInterface public boolean criPlayAmbience() {
        return criAudio.playAmbience();
    }

    @JavascriptInterface public boolean criPlayEffect(String effectId) {
        return criAudio.playEffect(effectId);
    }

    @JavascriptInterface public boolean criPauseMusic(boolean paused) {
        criAudio.pauseMusic(paused);
        return true;
    }

    @JavascriptInterface public boolean criSeekMusicRelative(long offsetMs) {
        return criAudio.seekMusicRelative(offsetMs);
    }

    @JavascriptInterface public boolean criStopMusic() {
        criAudio.stopMusic();
        return true;
    }

    @JavascriptInterface public void criSetVolume(String channel, int value) {
        if ("master".equalsIgnoreCase(channel)) criAudio.setMasterVolume(value);
        else if ("music".equalsIgnoreCase(channel)) criAudio.setMusicVolume(value);
        else if ("ambience".equalsIgnoreCase(channel)) criAudio.setAmbienceVolume(value);
        else if ("effects".equalsIgnoreCase(channel)) criAudio.setEffectsVolume(value);
    }

    public void dispose() {
        criAudio.dispose();
    }

    @JavascriptInterface public String getCustomMusicLibrary() {
        try {
            return prefs().getString(PREF_CUSTOM_MUSIC_LIBRARY, "[]");
        } catch (Exception ignored) {
            return "[]";
        }
    }

    @JavascriptInterface public String deleteCustomMusicTrack(String id) {
        try {
            if (id == null || !id.matches("[a-fA-F0-9-]{36}")) {
                return audioImportResult(false, "Pocket original music cannot be removed.", false);
            }
            JSONArray current = new JSONArray(getCustomMusicLibrary());
            JSONArray updated = new JSONArray();
            boolean found = false;
            for (int i = 0; i < current.length(); i++) {
                JSONObject item = current.optJSONObject(i);
                if (item == null) continue;
                if (id.equalsIgnoreCase(item.optString("id", ""))) found = true;
                else updated.put(item);
            }
            if (!found) return audioImportResult(false, "Only imported music can be removed.", false);
            if (!prefs().edit().putString(PREF_CUSTOM_MUSIC_LIBRARY, updated.toString()).commit()) {
                return audioImportResult(false, "Pocket could not update the music rack.", false);
            }
            criAudio.stopMusic();
            File musicDirectory = new File(activity.getFilesDir(), "music");
            String trackId = id.toLowerCase(Locale.ROOT);
            File wav = new File(musicDirectory, trackId + ".wav");
            File adx = new File(musicDirectory, trackId + ".adx");
            if (wav.isFile()) wav.delete();
            if (adx.isFile()) adx.delete();
            File decodedAdx = new File(new File(activity.getFilesDir(), "cri-audio-pcm"), trackId + ".adx.wav");
            if (decodedAdx.isFile()) decodedAdx.delete();
            return new JSONObject()
                .put("ok", true)
                .put("cancelled", false)
                .put("action", "removed")
                .put("message", "Imported music has been removed from your Pocket record rack.")
                .put("tracks", updated)
                .toString();
        } catch (Exception error) {
            return audioImportResult(false, "Pocket could not remove this imported record.", false);
        }
    }

    public String importAudioFile(Uri uri) {
        File temporary = null;
        try {
            if (uri == null) return audioImportResult(false, "No music file was selected.", true);
            long sourceSize = queryCustomAudioSize(uri);
            if (sourceSize > MAX_CUSTOM_MUSIC_BYTES) {
                return audioImportResult(false, "This record is too large. The source-file limit is 64 MB.", false);
            }
            File directory = new File(activity.getFilesDir(), "music");
            if (!directory.isDirectory() && !directory.mkdirs()) {
                return audioImportResult(false, "Pocket could not prepare its private music shelf.", false);
            }

            String displayName = PocketAudioImporter.queryDisplayName(activity, uri);
            boolean adxSource = displayName.toLowerCase(Locale.ROOT).endsWith(".adx");
            temporary = File.createTempFile("cri-import-", adxSource ? ".adx" : ".wav", directory);
            PocketAudioImporter.Result decoded = adxSource
                ? PocketAudioImporter.copyAdxSource(activity, uri, temporary)
                : PocketAudioImporter.decodeToWav(activity, uri, temporary);
            if (!decoded.ok) return audioImportResult(false, decoded.message, false);

            String id = java.util.UUID.randomUUID().toString();
            String storedExtension = adxSource ? ".adx" : ".wav";
            File stored = new File(directory, id + storedExtension);
            if (!temporary.renameTo(stored)) {
                try (InputStream input = new java.io.FileInputStream(temporary);
                     FileOutputStream output = new FileOutputStream(stored)) {
                    byte[] buffer = new byte[32 * 1024];
                    int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    output.getFD().sync();
                }
                long minimumLength = adxSource ? 32L : 44L;
                if (!stored.isFile() || stored.length() < minimumLength) {
                    stored.delete();
                    throw new IOException("Pocket could not save the imported record.");
                }
            }
            temporary = null;
            JSONArray tracks;
            try { tracks = new JSONArray(getCustomMusicLibrary()); }
            catch (Exception ignored) { tracks = new JSONArray(); }
            JSONObject entry = new JSONObject();
            entry.put("id", id);
            entry.put("title", decoded.title);
            entry.put("extension", decoded.sourceExtension);
            entry.put("mimeType", adxSource ? "application/octet-stream" : "audio/wav");
            entry.put("playbackType", adxSource ? "CRI_ADX" : "CRI_WAVE");
            tracks.put(entry);
            if (!prefs().edit().putString(PREF_CUSTOM_MUSIC_LIBRARY, tracks.toString()).commit()) {
                stored.delete();
                return audioImportResult(false, "Pocket could not update the music rack. Please try again.", false);
            }
            return new JSONObject()
                .put("ok", true)
                .put("cancelled", false)
                .put("message", decoded.message)
                .put("tracks", tracks)
                .toString();
        } catch (Exception error) {
            return audioImportResult(false, "The selected audio could not be prepared for CRI playback: " +
                (error.getMessage() == null ? "unknown audio error." : error.getMessage()), false);
        } finally {
            if (temporary != null && temporary.exists()) temporary.delete();
        }
    }

    private long queryCustomAudioSize(Uri uri) {
        try (Cursor cursor = activity.getContentResolver().query(uri,
                new String[]{android.provider.OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE);
                if (column >= 0 && !cursor.isNull(column)) return cursor.getLong(column);
            }
        } catch (Exception ignored) {}
        return -1L;
    }

    private String audioImportResult(boolean ok, String message, boolean cancelled) {
        try {
            return new JSONObject()
                .put("ok", ok)
                .put("cancelled", cancelled)
                .put("message", message)
                .put("tracks", new JSONArray(getCustomMusicLibrary()))
                .toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    private static final String POCKET_REPOSITORY = "Antarezka/Merzkava-Pocket";
    private static final long POCKET_VERSION_CODE_OFFSET = 10000L;

    @JavascriptInterface public String getPocketAppInfo() {
        JSONObject result = new JSONObject();
        try {
            PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            result.put("packageName", activity.getPackageName());
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            result.put("versionCode", versionCode);
            result.put("buildNumber", Math.max(0L, versionCode - POCKET_VERSION_CODE_OFFSET));
            result.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
            result.put("androidVersion", Build.VERSION.RELEASE == null ? "" : Build.VERSION.RELEASE);
            return result.toString();
        } catch (Exception error) {
            try {
                result.put("packageName", activity.getPackageName());
                result.put("versionName", "Unknown");
                result.put("versionCode", 0);
                result.put("buildNumber", 0);
                result.put("error", "Pocket could not read its installed build information.");
            } catch (Exception ignored) {}
            return result.toString();
        }
    }

    @JavascriptInterface public boolean showPocketUpdateNotification(
        int buildNumber, String versionName, String releaseDetails, String theme, long apkSizeBytes,
        String apkUrl, String apkName, String apkSha256) {
        if (buildNumber <= 0 || !notificationsGranted() || apkUrl == null || apkName == null || apkSha256 == null) return false;
        try {
            Uri updateUri = Uri.parse(apkUrl);
            String expectedUpdatePath = "/" + POCKET_REPOSITORY + "/releases/download/pocket-build-" + buildNumber + "/" + apkName;
            if (!"https".equals(updateUri.getScheme()) || !"github.com".equalsIgnoreCase(updateUri.getHost()) ||
                !expectedUpdatePath.equals(updateUri.getPath()) || !apkName.matches("Merzkava-Pocket-Build-[0-9]+-[A-Za-z0-9._-]+\\.apk") ||
                !apkSha256.toLowerCase(Locale.ROOT).matches("[a-f0-9]{64}")) return false;
            if (prefs().getInt(PREF_UPDATE_NOTIFIED_BUILD, 0) == buildNumber) return false;
            NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null || !manager.areNotificationsEnabled()) return false;

            boolean light = "light".equalsIgnoreCase(theme) || "white".equalsIgnoreCase(theme);
            int accent = light ? Color.rgb(105, 130, 99) : Color.rgb(203, 178, 119);
            int foreground = light ? Color.rgb(45, 57, 45) : Color.rgb(242, 237, 220);
            int muted = light ? Color.rgb(101, 108, 94) : Color.rgb(190, 198, 183);
            int background = light ? R.drawable.pocket_update_notification_light : R.drawable.pocket_update_notification_dark;

            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(
                    UPDATE_NOTIFICATION_CHANNEL_ID, "Pocket Updates", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("New Merzkava Pocket builds and release notes.");
                channel.enableLights(true);
                channel.setLightColor(accent);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
                manager.createNotificationChannel(channel);
            }

            String version = notificationText(versionName, 72);
            String details = notificationText(releaseDetails, 420);
            if (details.isEmpty()) details = "A new Merzkava Pocket build is ready. Tap DOWNLOAD UPDATE in this device notification.";
            String size = humanReadableUpdateSize(apkSizeBytes);
            prefs().edit().putString(PREF_UPDATE_NOTIFICATION_THEME, light ? "light" : "dark").apply();

            RemoteViews compact = new RemoteViews(activity.getPackageName(), R.layout.pocket_update_notification_compact);
            RemoteViews expanded = new RemoteViews(activity.getPackageName(), R.layout.pocket_update_notification_expanded);
            setPocketUpdateNotificationView(compact, background, accent, foreground, muted, buildNumber, version, size, details, false);
            setPocketUpdateNotificationView(expanded, background, accent, foreground, muted, buildNumber, version, size, details, true);

            Intent launch = activity.getPackageManager().getLaunchIntentForPackage(activity.getPackageName());
            PendingIntent openPocket = null;
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                openPocket = PendingIntent.getActivity(activity, UPDATE_NOTIFICATION_ID, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            }

            Intent downloadIntent = new Intent(activity, MainActivity.class);
            downloadIntent.setAction(MainActivity.ACTION_DOWNLOAD_UPDATE);
            downloadIntent.setData(Uri.parse("merzkava-pocket://update-download/" + buildNumber));
            downloadIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_URL, apkUrl);
            downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_FILE_NAME, apkName);
            downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_SHA256, apkSha256);
            downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_BUILD, buildNumber);
            PendingIntent downloadUpdate = PendingIntent.getActivity(activity, UPDATE_NOTIFICATION_ID + 1,
                downloadIntent, PendingIntent.FLAG_UPDATE_CURRENT |
                    (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            compact.setOnClickPendingIntent(R.id.pocket_update_notification_action, downloadUpdate);
            expanded.setOnClickPendingIntent(R.id.pocket_update_notification_action, downloadUpdate);

            Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(activity, UPDATE_NOTIFICATION_CHANNEL_ID)
                : new Notification.Builder(activity);
            builder.setSmallIcon(R.drawable.ic_notification_tv)
                .setContentTitle("Merzkava Pocket · Build #" + buildNumber)
                .setContentText("New Pocket update · " + size)
                .setColor(accent)
                .setCategory(Notification.CATEGORY_STATUS)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true);

            if (Build.VERSION.SDK_INT >= 24) {
                builder.setSubText(version)
                    .setCustomContentView(compact)
                    .setCustomHeadsUpContentView(compact)
                    .setCustomBigContentView(expanded);
            } else {
                builder.setContent(compact);
                if (!version.isEmpty()) builder.setContentInfo(version);
            }
            if (openPocket != null) builder.setContentIntent(openPocket);

            manager.notify(UPDATE_NOTIFICATION_ID, builder.build());
            prefs().edit().putInt(PREF_UPDATE_NOTIFIED_BUILD, buildNumber).apply();
            return true;
        } catch (Exception error) {
            android.util.Log.w("PocketUpdate", "Could not post the native themed update notification", error);
            return false;
        }
    }

    private void setPocketUpdateNotificationView(RemoteViews views, int background, int accent,
            int foreground, int muted, int buildNumber, String version, String size,
            String details, boolean expanded) {
        views.setInt(R.id.pocket_update_notification_root, "setBackgroundResource", background);
        views.setTextViewText(R.id.pocket_update_notification_brand, "MERZKAVA  /  POCKET");
        views.setTextViewText(R.id.pocket_update_notification_eyebrow, "UPDATE NOTICE");
        views.setTextViewText(R.id.pocket_update_notification_title, "A new build is ready");
        views.setTextViewText(R.id.pocket_update_notification_build, "BUILD #" + buildNumber + "  ·  " + version);
        views.setTextViewText(R.id.pocket_update_notification_summary, "APK " + size + "  ·  Download directly from this notice");
        views.setTextViewText(R.id.pocket_update_notification_action, "DOWNLOAD UPDATE");
        views.setViewVisibility(R.id.pocket_update_notification_progress, android.view.View.GONE);
        views.setViewVisibility(R.id.pocket_update_notification_action, android.view.View.VISIBLE);
        views.setTextColor(R.id.pocket_update_notification_brand, accent);
        views.setTextColor(R.id.pocket_update_notification_eyebrow, muted);
        views.setTextColor(R.id.pocket_update_notification_title, foreground);
        views.setTextColor(R.id.pocket_update_notification_build, accent);
        views.setTextColor(R.id.pocket_update_notification_summary, muted);
        if (expanded) {
            views.setTextViewText(R.id.pocket_update_notification_notes, details);
            views.setTextColor(R.id.pocket_update_notification_notes, muted);
        }
    }

    private String humanReadableUpdateSize(long bytes) {
        if (bytes <= 0L) return "size in Pocket Settings";
        if (bytes < 1024L) return bytes + " B";
        double kb = bytes / 1024.0;
        if (kb < 1024.0) return String.format(Locale.ROOT, "%.1f KB", kb);
        return String.format(Locale.ROOT, "%.1f MB", kb / 1024.0);
    }

    private String notificationText(String value, int maximumLength) {
        if (value == null) return "";
        String normalized = value.replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "").trim();
        if (normalized.length() > maximumLength) normalized = normalized.substring(0, maximumLength - 1) + "…";
        return normalized;
    }

    @JavascriptInterface public String getPocketStorageInfo() {
        JSONObject result = new JSONObject();
        try {
            StatFs storage = new StatFs(Environment.getDataDirectory().getAbsolutePath());
            long total = storage.getTotalBytes();
            long available = storage.getAvailableBytes();
            int freePercent = total > 0 ? (int) Math.max(0L, Math.min(100L, Math.round(available * 100.0 / total))) : 0;
            result.put("totalBytes", total);
            result.put("availableBytes", available);
            result.put("usedBytes", Math.max(0L, total - available));
            result.put("freePercent", freePercent);
            result.put("available", total > 0);
            result.put("storageType", "internal");
        } catch (Exception error) {
            try {
                result.put("totalBytes", 0);
                result.put("availableBytes", 0);
                result.put("usedBytes", 0);
                result.put("freePercent", 0);
                result.put("available", false);
                result.put("storageType", "internal");
            } catch (Exception ignored) {}
        }
        Uri tree = PocketUpdateStorage.savedTreeUri(activity);
        Uri directory = PocketUpdateStorage.savedDirectoryUri(activity);
        boolean folderAvailable = PocketUpdateStorage.directoryAvailable(activity, directory);
        String label = folderAvailable
            ? prefs().getString(PocketUpdateStorage.PREF_DIRECTORY_LABEL,
                PocketUpdateStorage.displayPath(activity, tree))
            : (tree == null ? "Choose a folder for Pocket updates"
                : "Folder access unavailable · choose again");
        try {
            result.put("updateFolderSelected", folderAvailable);
            result.put("updateDownloadPath", label);
        } catch (Exception ignored) {}
        return result.toString();
    }

    public String setPocketUpdateFolder(Uri treeUri, int grantFlags) {
        try {
            if (treeUri == null || !DocumentsContract.isTreeUri(treeUri)) {
                throw new IOException("The selected location is not a supported folder.");
            }
            SharedPreferences preferences = prefs();
            Uri oldTree = PocketUpdateStorage.savedTreeUri(activity);
            Uri oldFile = PocketUpdateStorage.savedApkUri(activity);
            if (oldFile != null && PocketUpdateStorage.exists(activity, oldFile) &&
                (oldTree == null || !oldTree.equals(treeUri))) {
                throw new IOException("Remove or install the current downloaded APK before changing its folder.");
            }
            if (oldTree != null && !oldTree.equals(treeUri) &&
                "copying".equals(preferences.getString(PocketUpdateStorage.PREF_STATUS, ""))) {
                throw new IOException("Pocket is saving the verified APK. Change the folder after saving finishes.");
            }
            int persistedFlags = grantFlags &
                (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if ((persistedFlags & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0) {
                throw new IOException("Pocket needs write access to the folder you choose.");
            }
            activity.getContentResolver().takePersistableUriPermission(treeUri, persistedFlags);
            Uri directory = PocketUpdateStorage.createOrFindPocketDirectory(activity, treeUri);
            String label = PocketUpdateStorage.displayPath(activity, treeUri);
            if (!preferences.edit()
                    .putString(PocketUpdateStorage.PREF_TREE_URI, treeUri.toString())
                    .putString(PocketUpdateStorage.PREF_DIRECTORY_URI, directory.toString())
                    .putString(PocketUpdateStorage.PREF_DIRECTORY_LABEL, label)
                    .commit()) {
                throw new IOException("Pocket could not save the selected update folder.");
            }
            long downloadId = preferences.getLong(PREF_UPDATE_DOWNLOAD_ID, -1L);
            int buildNumber = preferences.getInt(PREF_UPDATE_BUILD_NUMBER, 0);
            if (downloadId >= 0L) PocketUpdateCopyWorker.schedule(activity, downloadId, buildNumber);
            return new JSONObject().put("ok", true).put("path", label).toString();
        } catch (Exception error) {
            try {
                return new JSONObject().put("ok", false).put("message",
                    error.getMessage() == null ? "Pocket could not access that folder." : error.getMessage()).toString();
            } catch (Exception ignored) { return "{}"; }
        }
    }

    @JavascriptInterface public boolean choosePocketUpdateFolder() {
        if (!(activity instanceof MainActivity)) return false;
        activity.runOnUiThread(() -> ((MainActivity) activity).openPocketUpdateFolderPicker());
        return true;
    }

    @JavascriptInterface public boolean openPocketUpdateFolder() {
        try {
            Uri directory = PocketUpdateStorage.savedDirectoryUri(activity);
            if (!PocketUpdateStorage.directoryAvailable(activity, directory)) return false;
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(directory, DocumentsContract.Document.MIME_TYPE_DIR);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            activity.runOnUiThread(() ->
                activity.startActivity(Intent.createChooser(view, "Choose a file manager")));
            return true;
        } catch (Exception error) {
            android.util.Log.w("PocketUpdate", "No compatible file manager could open the selected Pocket folder.", error);
            return false;
        }
    }

    @JavascriptInterface public boolean confirmRemovePocketUpdateApk() {
        activity.runOnUiThread(() -> new AlertDialog.Builder(activity)
            .setTitle("Remove Pocket update APK?")
            .setMessage("This removes only the downloaded Pocket update APK and its updater record. The installed app, player profiles, settings, music and game data stay untouched.")
            .setNegativeButton("CANCEL", (dialog, which) -> dialog.dismiss())
            .setPositiveButton("REMOVE APK", (dialog, which) -> {
                removeCurrentPocketUpdateApk();
                dispatchPocketUpdateFileChange();
            })
            .show());
        return true;
    }

    @JavascriptInterface public boolean confirmCleanOldPocketBuilds() {
        activity.runOnUiThread(() -> new AlertDialog.Builder(activity)
            .setTitle("Clean old Pocket build files?")
            .setMessage("This removes only Pocket installer APK files with build numbers at or below the build currently installed on this device. Newer downloaded builds are kept. The installed Pocket app, player profiles, settings, music and game data are not removed.")
            .setNegativeButton("CANCEL", (dialog, which) -> dialog.dismiss())
            .setPositiveButton("CLEAN OLD BUILDS", (dialog, which) -> startPocketOldBuildCleanup())
            .show());
        return true;
    }

    private void startPocketOldBuildCleanup() {
        dispatchPocketOldBuildCleanupStarted();
        Thread worker = new Thread(() -> {
            try {
                int installedBuild = PocketUpdateInstalledReceiver.cleanupInstalledOrOlder(activity);
                dispatchPocketOldBuildCleanupFinished(true, installedBuild,
                    "Cleanup scan finished for Build #" + installedBuild + " and older. Newer Pocket builds and the installed app were kept.");
            } catch (Exception error) {
                String message = error.getMessage() == null
                    ? "Pocket could not finish cleaning the old build files." : error.getMessage();
                dispatchPocketOldBuildCleanupFinished(false, 0, message);
            }
        }, "Pocket-Old-Build-Cleanup");
        worker.setDaemon(true);
        worker.start();
    }

    private void dispatchPocketOldBuildCleanupStarted() {
        WebView target = webView;
        if (target == null) return;
        target.post(() -> target.evaluateJavascript(
            "window.dispatchEvent(new Event('pocket:update-cleanup-started'));", null));
    }

    private void dispatchPocketOldBuildCleanupFinished(boolean ok, int buildNumber, String message) {
        WebView target = webView;
        if (target == null) return;
        JSONObject detail = new JSONObject();
        try {
            detail.put("ok", ok);
            detail.put("buildNumber", buildNumber);
            detail.put("message", message == null ? "" : message);
        } catch (Exception ignored) {}
        String payload = detail.toString();
        target.post(() -> target.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pocket:update-cleanup-complete',{detail:" + payload + "}));", null));
    }

    private void removeCurrentPocketUpdateApk() {
        SharedPreferences preferences = prefs();
        long downloadId = preferences.getLong(PREF_UPDATE_DOWNLOAD_ID, -1L);
        DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadId >= 0L && manager != null) {
            try { manager.remove(downloadId); } catch (Exception ignored) {}
        }
        Uri saved = PocketUpdateStorage.savedApkUri(activity);
        if (saved != null) PocketUpdateStorage.delete(activity, saved);
        Uri directory = PocketUpdateStorage.savedDirectoryUri(activity);
        if (directory != null) PocketUpdateStorage.removePocketApks(activity, directory, -1);
        clearPocketUpdateDownloadState();
    }

    private void dispatchPocketUpdateFileChange() {
        WebView target = webView;
        if (target == null) return;
        target.post(() -> target.evaluateJavascript(
            "window.dispatchEvent(new Event('pocket:update-file-changed'));", null));
    }

    @JavascriptInterface public void checkPocketUpdate(String requestId) {
        if (requestId == null || requestId.trim().isEmpty()) return;
        Thread thread = new Thread(() -> {
            boolean ok = false;
            String payload = "{}";
            String errorMessage = "";
            try {
                JSONObject release = new JSONObject(fetch(
                    "https://api.github.com/repos/" + POCKET_REPOSITORY + "/releases/latest"
                ));
                String tag = release.optString("tag_name", "");
                Matcher tagMatch = Pattern.compile("^pocket-build-([0-9]+)$").matcher(tag);
                if (!tagMatch.matches()) throw new IOException("The latest public release is not a Pocket build.");

                JSONArray assets = release.optJSONArray("assets");
                if (assets == null) throw new IOException("The Pocket release does not contain its update files.");
                String manifestUrl = "";
                JSONObject apkAsset = null;
                for (int i = 0; i < assets.length(); i++) {
                    JSONObject asset = assets.optJSONObject(i);
                    if (asset == null) continue;
                    String name = asset.optString("name", "");
                    if ("pocket-update.json".equals(name)) manifestUrl = asset.optString("browser_download_url", "");
                    else if (name.toLowerCase(Locale.ROOT).endsWith(".apk")) apkAsset = asset;
                }
                if (manifestUrl.isEmpty() || apkAsset == null) throw new IOException("The Pocket release manifest or APK is missing.");

                Uri manifestUri = Uri.parse(manifestUrl);
                if (!"https".equals(manifestUri.getScheme()) ||
                    !"github.com".equalsIgnoreCase(manifestUri.getHost()) ||
                    manifestUri.getPath() == null ||
                    !manifestUri.getPath().contains("/" + POCKET_REPOSITORY + "/releases/download/")) {
                    throw new IOException("The Pocket update manifest URL is not trusted.");
                }
                JSONObject updateManifest = new JSONObject(fetch(manifestUrl));
                if (!"com.merzkava.pocket".equals(updateManifest.optString("packageName", ""))) {
                    throw new IOException("The update package does not belong to Merzkava Pocket.");
                }
                int buildNumber = updateManifest.optInt("buildNumber", -1);
                int tagBuild = Integer.parseInt(tagMatch.group(1));
                if (buildNumber != tagBuild) throw new IOException("The Pocket build number does not match its release tag.");

                String apkName = updateManifest.optString("apkName", "");
                String apkUrl = apkAsset.optString("browser_download_url", "");
                if (!apkName.equals(apkAsset.optString("name", "")) ||
                    !apkName.matches("[A-Za-z0-9._-]+\\.apk")) {
                    throw new IOException("The Pocket APK filename is invalid.");
                }
                Uri apkUri = Uri.parse(apkUrl);
                String expectedPrefix = "/" + POCKET_REPOSITORY + "/releases/download/" + tag + "/";
                if (!"https".equals(apkUri.getScheme()) ||
                    !"github.com".equalsIgnoreCase(apkUri.getHost()) ||
                    apkUri.getPath() == null || !apkUri.getPath().startsWith(expectedPrefix)) {
                    throw new IOException("The Pocket APK download address is not trusted.");
                }
                String hash = updateManifest.optString("sha256", "").toLowerCase(Locale.ROOT);
                if (!hash.matches("[a-f0-9]{64}")) throw new IOException("The Pocket release is missing its APK integrity hash.");
                long apkSize = apkAsset.optLong("size", 0L);
                long manifestSize = updateManifest.optLong("apkSizeBytes", 0L);
                if (apkSize <= 0L || (manifestSize > 0L && manifestSize != apkSize)) {
                    throw new IOException("The Pocket APK size does not match its release manifest.");
                }

                PackageInfo installed = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
                long installedCode = Build.VERSION.SDK_INT >= 28 ? installed.getLongVersionCode() : installed.versionCode;
                long installedBuild = Math.max(0L, installedCode - POCKET_VERSION_CODE_OFFSET);
                JSONObject result = new JSONObject();
                result.put("packageName", "com.merzkava.pocket");
                result.put("tag", tag);
                result.put("buildNumber", buildNumber);
                result.put("versionName", updateManifest.optString("versionName", tag));
                result.put("commit", updateManifest.optString("commit", ""));
                result.put("publishedAt", release.optString("published_at", ""));
                result.put("releaseUrl", release.optString("html_url", ""));
                result.put("apkName", apkName);
                result.put("apkUrl", apkUrl);
                result.put("apkSizeBytes", apkSize);
                result.put("apkSha256", hash);
                result.put("currentBuild", installedBuild);
                result.put("currentVersionName", installed.versionName == null ? "" : installed.versionName);
                result.put("hasUpdate", buildNumber > installedBuild);
                JSONArray notes = updateManifest.optJSONArray("notes");
                result.put("notes", notes == null ? new JSONArray() : notes);
                result.put("releaseNotes", release.optString("body", ""));
                payload = result.toString();
                ok = true;
            } catch (Exception error) {
                errorMessage = error instanceof IOException ? error.getMessage()
                    : "Could not check the public Pocket update release. Check your connection and try again.";
            }
            completeUpdateCheck(requestId, ok, payload, errorMessage);
        }, "Pocket-Update-Check");
        thread.setDaemon(true);
        thread.start();
    }

    private void completeUpdateCheck(String requestId, boolean ok, String payload, String error) {
        if (requestId == null || requestId.trim().isEmpty()) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.updateCheck("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(payload == null ? "{}" : payload) + ","
            + JSONObject.quote(error == null ? "" : error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript(script, null);
        });
    }

    private int getInstalledPocketBuildNumber() throws Exception {
        PackageInfo installed = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        long versionCode = Build.VERSION.SDK_INT >= 28 ? installed.getLongVersionCode() : installed.versionCode;
        return (int)Math.max(0L, versionCode - POCKET_VERSION_CODE_OFFSET);
    }

    private void clearPocketUpdateDownloadState() {
        SharedPreferences preferences = prefs();
        long oldId = preferences.getLong(PREF_UPDATE_DOWNLOAD_ID, -1L);
        String oldName = preferences.getString(PREF_UPDATE_FILE_NAME, "");
        if (oldId >= 0L) {
            try {
                DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager != null) manager.remove(oldId);
            } catch (Exception error) {
                android.util.Log.w("PocketUpdate", "Could not remove a stale updater download row.", error);
            }
        }
        Uri oldSaved = PocketUpdateStorage.savedApkUri(activity);
        if (oldSaved != null) PocketUpdateStorage.delete(activity, oldSaved);
        if (oldName != null && oldName.matches("Merzkava-Pocket-Build-[0-9]+-[A-Za-z0-9._-]+\\.apk")) {
            File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (directory != null) {
                File oldFile = new File(directory, oldName);
                if (oldFile.isFile() && !oldFile.delete()) {
                    android.util.Log.w("PocketUpdate", "Could not delete stale Pocket APK " + oldName);
                }
            }
        }
        preferences.edit().remove(PREF_UPDATE_DOWNLOAD_ID).remove(PREF_UPDATE_SHA256)
            .remove(PREF_UPDATE_FILE_NAME).remove(PREF_UPDATE_BUILD_NUMBER).remove(PREF_UPDATE_URL)
            .remove(PocketUpdateStorage.PREF_SAVED_URI).remove(PocketUpdateStorage.PREF_STATUS)
            .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE).commit();
    }

    private void removePocketApkFilesExcept(int keepBuildNumber) {
        File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory != null && directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null) {
                Pattern apkPattern = Pattern.compile("^Merzkava-Pocket-Build-([0-9]+)-[A-Za-z0-9._-]+\\.apk$");
                for (File file : files) {
                    if (!file.isFile()) continue;
                    Matcher match = apkPattern.matcher(file.getName());
                    if (!match.matches()) continue;
                    try {
                        int fileBuild = Integer.parseInt(match.group(1));
                        if (fileBuild != keepBuildNumber && !file.delete()) {
                            android.util.Log.w("PocketUpdate", "Could not remove older Pocket APK " + file.getName());
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        Uri savedDirectory = PocketUpdateStorage.savedDirectoryUri(activity);
        if (savedDirectory != null) PocketUpdateStorage.removePocketApks(activity, savedDirectory, keepBuildNumber);
    }

    @JavascriptInterface public String startPocketUpdateDownload(String address, String fileName, String sha256, int buildNumber) {
        try {
            Uri updateDirectory = PocketUpdateStorage.savedDirectoryUri(activity);
            if (!PocketUpdateStorage.directoryAvailable(activity, updateDirectory)) {
                return new JSONObject().put("ok", false)
                    .put("message", "Choose or reselect a folder for Pocket updates in Settings first.").toString();
            }
            if (address == null || fileName == null || sha256 == null || buildNumber <= 0 ||
                !fileName.matches("Merzkava-Pocket-Build-[0-9]+-[A-Za-z0-9._-]+\\.apk") ||
                !sha256.toLowerCase(Locale.ROOT).matches("[a-f0-9]{64}")) {
                return new JSONObject().put("ok", false).put("message", "The Pocket update download details are invalid.").toString();
            }
            int installedBuild = getInstalledPocketBuildNumber();
            if (buildNumber <= installedBuild) {
                clearPocketUpdateDownloadState();
                removePocketApkFilesExcept(-1);
                return new JSONObject().put("ok", false).put("message", "This Pocket build is already installed. Check Again for the newest release.").toString();
            }
            Uri uri = Uri.parse(address);
            String prefix = "/" + POCKET_REPOSITORY + "/releases/download/pocket-build-";
            Matcher releasePath = uri.getPath() == null ? Pattern.compile("$").matcher("") :
                Pattern.compile("^" + Pattern.quote(prefix) + "([0-9]+)/" + Pattern.quote(fileName) + "$").matcher(uri.getPath());
            if (!"https".equals(uri.getScheme()) || !"github.com".equalsIgnoreCase(uri.getHost()) ||
                !releasePath.matches() || Integer.parseInt(releasePath.group(1)) != buildNumber) {
                return new JSONObject().put("ok", false).put("message", "The Pocket update download address is not trusted.").toString();
            }

            JSONObject existing = new JSONObject(getPocketUpdateDownloadState(buildNumber));
            String existingStatus = existing.optString("status", "idle");
            if (existing.optInt("buildNumber", 0) == buildNumber &&
                ("queued".equals(existingStatus) || "downloading".equals(existingStatus) ||
                 "paused".equals(existingStatus) || "copying".equals(existingStatus) ||
                 "completed".equals(existingStatus) || "folder_unavailable".equals(existingStatus))) {
                existing.put("ok", true);
                existing.put("message", "This build already has a download. Pocket has restored its current progress.");
                clearPocketUpdateAvailableNotification();
                return existing.toString();
            }
            if (existing.optInt("buildNumber", 0) == buildNumber && "save_failed".equals(existingStatus)) {
                long existingId = existing.optLong("downloadId", prefs().getLong(PREF_UPDATE_DOWNLOAD_ID, -1L));
                prefs().edit().putString(PocketUpdateStorage.PREF_STATUS, "copying")
                    .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE).apply();
                PocketUpdateCopyWorker.schedule(activity, existingId, buildNumber);
                existing.put("ok", true).put("status", "copying")
                    .put("message", "Retrying the verified APK save into your selected folder.");
                return existing.toString();
            }

            // A different release starts with a fresh DownloadManager row, hash, file and 0% progress.
            clearPocketUpdateDownloadState();
            removePocketApkFilesExcept(-1);
            DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IOException("Android Download Manager is unavailable.");
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setMimeType("application/vnd.android.package-archive");
            request.setTitle("Merzkava Pocket · Build #" + buildNumber);
            request.setDescription("Downloading " + fileName);
            // The app cannot use VISIBILITY_HIDDEN: Android reserves DOWNLOAD_WITHOUT_NOTIFICATION.
            // Let DownloadManager show its device-level progress notification; Settings keeps the
            // in-app build details, progress state and SHA-verified Install action.
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            request.setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            long id = manager.enqueue(request);
            if (!prefs().edit().putLong(PREF_UPDATE_DOWNLOAD_ID, id)
                .putString(PREF_UPDATE_SHA256, sha256.toLowerCase(Locale.ROOT))
                .putString(PREF_UPDATE_FILE_NAME, fileName)
                .putString(PREF_UPDATE_URL, address)
                .putInt(PREF_UPDATE_BUILD_NUMBER, buildNumber)
                .remove(PocketUpdateStorage.PREF_SAVED_URI)
                .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE)
                .putString(PocketUpdateStorage.PREF_STATUS, "queued").commit()) {
                manager.remove(id);
                clearPocketUpdateDownloadState();
                return new JSONObject().put("ok", false).put("message", "Pocket could not save the new build download state.").toString();
            }
            clearPocketUpdateAvailableNotification();
            return new JSONObject().put("ok", true).put("downloadId", id).put("buildNumber", buildNumber)
                .put("status", "queued").put("progress", 0).put("bytesDownloaded", 0).put("totalBytes", 0)
                .put("message", "Pocket Build #" + buildNumber + " download has started.").toString();
        } catch (Exception error) {
            android.util.Log.e("PocketUpdate", "The Settings or device-notification download action could not be started.", error);
            try {
                return new JSONObject().put("ok", false)
                    .put("message", "Pocket could not start the new update download. Check storage and connection.").toString();
            } catch (Exception ignored) { return "{}"; }
        }
    }

    @JavascriptInterface public String getPocketUpdateDownloadState() {
        return getPocketUpdateDownloadState(0);
    }

    @JavascriptInterface public String getPocketUpdateDownloadState(int expectedBuildNumber) {
        JSONObject result = new JSONObject();
        SharedPreferences preferences = prefs();
        long id = preferences.getLong(PREF_UPDATE_DOWNLOAD_ID, -1L);
        int targetBuild = preferences.getInt(PREF_UPDATE_BUILD_NUMBER, 0);
        Uri savedUri = PocketUpdateStorage.savedApkUri(activity);
        Uri selectedDirectory = PocketUpdateStorage.savedDirectoryUri(activity);
        boolean selectedFolderAvailable = PocketUpdateStorage.directoryAvailable(activity, selectedDirectory);

        // Reconcile build identity and installed build before trusting a saved APK URI.
        if (targetBuild > 0 && expectedBuildNumber > 0 && targetBuild != expectedBuildNumber) {
            clearPocketUpdateDownloadState();
            id = -1L;
            targetBuild = 0;
            savedUri = null;
        }
        if (targetBuild > 0) {
            try {
                int installedBuild = getInstalledPocketBuildNumber();
                if (targetBuild <= installedBuild) {
                    clearPocketUpdateDownloadState();
                    removePocketApkFilesExcept(-1);
                    id = -1L;
                    targetBuild = 0;
                    savedUri = null;
                }
            } catch (Exception error) {
                android.util.Log.w("PocketUpdate", "Could not compare downloaded and installed Pocket build numbers.", error);
            }
        }

        if (savedUri != null) {
            if (!selectedFolderAvailable) {
                try {
                    return result.put("downloadId", id).put("buildNumber", targetBuild)
                        .put("status", "folder_unavailable").put("progress", 0)
                        .put("bytesDownloaded", 0).put("totalBytes", 0)
                        .put("message", "Pocket cannot access the selected folder. Choose it again in Settings.")
                        .toString();
                } catch (Exception ignored) { return "{}"; }
            }
            if (PocketUpdateStorage.exists(activity, savedUri)) {
                long size = PocketUpdateStorage.size(activity, savedUri);
                try {
                    return result.put("downloadId", id).put("buildNumber", targetBuild)
                        .put("status", "completed").put("progress", 100)
                        .put("bytesDownloaded", size).put("totalBytes", size)
                        .put("savedUriAvailable", true).put("savedUri", savedUri.toString())
                        .put("message", "The verified APK is saved in your Merzkava Pocket folder.")
                        .toString();
                } catch (Exception ignored) { return "{}"; }
            }
            preferences.edit().remove(PocketUpdateStorage.PREF_SAVED_URI)
                .putString(PocketUpdateStorage.PREF_STATUS, "missing").apply();
            savedUri = null;
        }

        try {
            result.put("downloadId", id);
            result.put("buildNumber", targetBuild > 0 ? targetBuild : expectedBuildNumber);
            if (id < 0L) {
                String previous = preferences.getString(PocketUpdateStorage.PREF_STATUS, "");
                String status = "missing".equals(previous) ? "missing" : "idle";
                String message = "missing".equals(status)
                    ? "The APK was removed or moved in your file manager. Download it again."
                    : "";
                return result.put("status", status).put("progress", 0)
                    .put("bytesDownloaded", 0).put("totalBytes", 0)
                    .put("message", message).toString();
            }
            DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            Cursor cursor = manager == null ? null : manager.query(new DownloadManager.Query().setFilterById(id));
            if (cursor == null) {
                return result.put("status", "missing").put("buildNumber", targetBuild)
                    .put("progress", 0).put("bytesDownloaded", 0).put("totalBytes", 0)
                    .put("message", "Android lost the temporary download. Download the update again.").toString();
            }
            try {
                if (!cursor.moveToFirst()) {
                    return result.put("status", "missing").put("buildNumber", targetBuild)
                        .put("progress", 0).put("bytesDownloaded", 0).put("totalBytes", 0)
                        .put("message", "Android lost the temporary download. Download the update again.").toString();
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                int progress = total > 0L ? (int)Math.max(0L, Math.min(100L, Math.round(downloaded * 100.0 / total))) : 0;
                if (status == DownloadManager.STATUS_PENDING || status == DownloadManager.STATUS_RUNNING ||
                    status == DownloadManager.STATUS_PAUSED) {
                    String state = status == DownloadManager.STATUS_PENDING ? "queued" :
                        status == DownloadManager.STATUS_PAUSED ? "paused" : "downloading";
                    result.put("status", state).put("bytesDownloaded", downloaded).put("totalBytes", total)
                        .put("progress", progress);
                } else if (status == DownloadManager.STATUS_FAILED) {
                    int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    result.put("status", "failed").put("progress", 0).put("bytesDownloaded", 0).put("totalBytes", total)
                        .put("reason", reason).put("message", "The Build #" + targetBuild +
                            " download failed (code " + reason + "). Check storage and connection.");
                } else if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    Uri staging = manager.getUriForDownloadedFile(id);
                    String savedState = preferences.getString(PocketUpdateStorage.PREF_STATUS, "");
                    String savedMessage = preferences.getString(PocketUpdateStorage.PREF_STATUS_MESSAGE, "");
                    if (staging == null) {
                        result.put("status", "missing").put("progress", 0).put("bytesDownloaded", 0).put("totalBytes", 0)
                            .put("message", "The completed APK is no longer available. Download it again.");
                    } else if ("save_failed".equals(savedState) || "failed".equals(savedState)) {
                        result.put("status", savedState).put("progress", 100)
                            .put("bytesDownloaded", downloaded).put("totalBytes", total)
                            .put("message", savedMessage.isEmpty() ? "Pocket could not save the verified APK. Check the folder and retry." : savedMessage);
                    } else if (!selectedFolderAvailable) {
                        result.put("status", "folder_unavailable").put("progress", 100)
                            .put("bytesDownloaded", downloaded).put("totalBytes", total)
                            .put("message", "Choose or reselect the folder where Pocket should save the APK.");
                        preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "folder_unavailable")
                            .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE,
                                "Choose or reselect the folder where Pocket should save the APK.").apply();
                    } else {
                        result.put("status", "copying").put("progress", 100)
                            .put("bytesDownloaded", downloaded).put("totalBytes", total)
                            .put("message", "Saving the verified APK to your selected folder…");
                        if (!"copying".equals(savedState) || !PocketUpdateCopyWorker.isRunning(id)) {
                            preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "copying")
                                .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE).apply();
                            PocketUpdateCopyWorker.schedule(activity, id, targetBuild);
                        }
                    }
                } else {
                    result.put("status", "unknown").put("progress", progress)
                        .put("bytesDownloaded", downloaded).put("totalBytes", total)
                        .put("message", "Waiting for Android Download Manager.");
                }
            } finally { cursor.close(); }
        } catch (Exception error) {
            try { result.put("status", "unknown").put("message", "Could not read the Pocket download state."); }
            catch (Exception ignored) {}
        }
        return result.toString();
    }

    @JavascriptInterface public String installDownloadedPocketUpdate() {
        try {
            Uri apkUri = PocketUpdateStorage.savedApkUri(activity);
            Uri directory = PocketUpdateStorage.savedDirectoryUri(activity);
            if (apkUri == null) {
                JSONObject state = new JSONObject(getPocketUpdateDownloadState());
                if ("copying".equals(state.optString("status", ""))) {
                    return new JSONObject().put("ok", false).put("message",
                        "Pocket is still saving the APK to your selected folder. Try Install again when it is ready.").toString();
                }
                return new JSONObject().put("ok", false).put("message",
                    "There is no completed APK in the selected folder. Download the update first.").toString();
            }
            if (!PocketUpdateStorage.directoryAvailable(activity, directory) ||
                !PocketUpdateStorage.exists(activity, apkUri)) {
                prefs().edit().remove(PocketUpdateStorage.PREF_SAVED_URI)
                    .putString(PocketUpdateStorage.PREF_STATUS, "missing").apply();
                throw new IOException("The APK is no longer in the selected folder. Choose the folder again or download it again.");
            }
            String expected = prefs().getString(PREF_UPDATE_SHA256, "");
            if (!expected.matches("[a-f0-9]{64}")) throw new IOException("The Pocket APK integrity record is missing.");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = activity.getContentResolver().openInputStream(apkUri)) {
                if (input == null) throw new IOException("The downloaded Pocket APK could not be read.");
                byte[] buffer = new byte[16 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
            }
            StringBuilder actual = new StringBuilder();
            for (byte value : digest.digest()) actual.append(String.format(Locale.ROOT, "%02x", value & 0xff));
            if (!expected.equalsIgnoreCase(actual.toString())) {
                PocketUpdateStorage.delete(activity, apkUri);
                prefs().edit().remove(PocketUpdateStorage.PREF_SAVED_URI)
                    .putString(PocketUpdateStorage.PREF_STATUS, "missing").apply();
                throw new IOException("The APK failed its SHA-256 integrity check. The file was removed.");
            }
            if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName()));
                permission.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                activity.startActivity(permission);
                return new JSONObject().put("ok", false).put("permissionRequired", true)
                    .put("message", "Allow Pocket to install this verified update, then return and tap Install again.").toString();
            }
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, PocketUpdateStorage.APK_MIME);
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(install);
            return new JSONObject().put("ok", true)
                .put("message", "Android package installer opened. Confirm the Pocket update there.").toString();
        } catch (Exception error) {
            String message = error instanceof IOException ? error.getMessage()
                : "Android could not open the Pocket package installer.";
            try { return new JSONObject().put("ok", false).put("message", message).toString(); }
            catch (Exception ignored) { return "{}"; }
        }
    }

    @JavascriptInterface public String getReadiness() {
        boolean overlay = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(activity);
        NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean notifications = Build.VERSION.SDK_INT < 33 || manager.areNotificationsEnabled();
        PowerManager power = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
        boolean battery = Build.VERSION.SDK_INT < 23 || power.isIgnoringBatteryOptimizations(activity.getPackageName());
        boolean running = PocketFloatingService.isRunning();
        JSONObject state = new JSONObject();
        try {
            state.put("displayOverApps", overlay);
            state.put("notifications", notifications);
            state.put("batteryExemption", battery);
            state.put("serviceRunning", running);
            state.put("bubbleVisible", PocketFloatingService.isBubbleVisible());
            state.put("supported", true);
            return state.toString();
        } catch (Exception ignored) {
            return "{\"displayOverApps\":false,\"notifications\":false,\"batteryExemption\":false,\"serviceRunning\":false,\"bubbleVisible\":false,\"supported\":true}";
        }
    }

    @JavascriptInterface public void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(activity)) {
            activity.startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + activity.getPackageName())));
        }
    }

    @JavascriptInterface public void requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
            activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7401);
        }
    }

    @JavascriptInterface public void requestBatteryExemption() {
        if (Build.VERSION.SDK_INT >= 23) {
            try {
                activity.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + activity.getPackageName())));
            } catch (Exception ignored) {
                activity.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        }
    }

    @JavascriptInterface public boolean startBubbleMode() {
        if (!overlayGranted() || !notificationsGranted() || !batteryExempt()) return false;
        try {
            if (activity instanceof MainActivity && ((MainActivity) activity).isFloatingMiniWindowOpen()) {
                activity.runOnUiThread(() -> ((MainActivity) activity).minimizeFloatingMiniWindowToBubble());
            } else {
                Intent intent = new Intent(activity, PocketFloatingService.class);
                intent.setAction(PocketFloatingService.ACTION_BUBBLE);
                startPocketService(intent);
            }
            return true;
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not request the floating bubble", error);
            return false;
        }
    }

    @JavascriptInterface public boolean openMiniWindow() {
        if (!overlayGranted()) return false;
        try {
            Intent intent = new Intent(activity, PocketFloatingService.class);
            intent.setAction(PocketFloatingService.ACTION_HIDE_BUBBLE);
            startPocketService(intent);
            activity.runOnUiThread(() -> {
                if (activity instanceof MainActivity) ((MainActivity) activity).openFloatingMiniWindow();
            });
            return true;
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not open the floating mini window", error);
            return false;
        }
    }

    @JavascriptInterface public void stopFloatingMode() {
        activity.runOnUiThread(() -> {
            if (activity instanceof MainActivity) ((MainActivity) activity).restoreFloatingToActivity();
            else activity.stopService(new Intent(activity, PocketFloatingService.class));
        });
    }

    @JavascriptInterface public void movePocketToBackground() {
        activity.runOnUiThread(() -> {
            if (!activity.isFinishing()) activity.moveTaskToBack(true);
        });
    }

    private void startPocketService(Intent intent) {
        if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(intent);
        else activity.startService(intent);
    }

    private void clearPocketUpdateAvailableNotification() {
        try {
            NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(UPDATE_NOTIFICATION_ID);
        } catch (Exception error) {
            android.util.Log.w("PocketUpdate", "Could not clear the already-used update-available notification.", error);
        }
    }

    private boolean overlayGranted() {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(activity);
    }

    private boolean notificationsGranted() {
        if (Build.VERSION.SDK_INT < 33) return true;
        NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager.areNotificationsEnabled();
    }

    private boolean batteryExempt() {
        if (Build.VERSION.SDK_INT < 23) return true;
        PowerManager power = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
        return power.isIgnoringBatteryOptimizations(activity.getPackageName());
    }

    // Uses the same Merzkava APK PBKDF2-SHA-256 verifier contract. Raw credentials are never returned to JS.
    @JavascriptInterface public void authenticateDeveloper(String identifier, String password, boolean remember, String requestId) {
        if (requestId == null || identifier == null || password == null) {
            completeDeveloper(requestId, false, "", "", "Enter the Developer ID and password.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                boolean valid = verifyDeveloperCredentials(identifier, password);
                if (!valid) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "", "Developer ID or password is incorrect.");
                    return;
                }
                if (!saveDeveloperSession(remember, identifier, password)) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "", "Could not securely apply the Developer session on this device.");
                    return;
                }
                completeDeveloper(requestId, true, identifier.trim(), "developer-verifier-v1", "");
            } catch (Exception ignored) {
                prefs().edit().putBoolean(PREF_SESSION, false).apply();
                completeDeveloper(requestId, false, "", "", "Developer verification is unavailable on this device.");
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Developer-Verify");
        thread.setDaemon(true);
        thread.start();
    }

    private boolean verifyDeveloperCredentials(String identifier, String password) throws Exception {
        byte[] idCandidate = pbkdf2(identifier.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
            Base64.decode(ID_SALT, Base64.DEFAULT));
        byte[] passwordCandidate = pbkdf2(password.getBytes(StandardCharsets.UTF_8),
            Base64.decode(PASSWORD_SALT, Base64.DEFAULT));
        return MessageDigest.isEqual(idCandidate, Base64.decode(ID_VERIFIER, Base64.DEFAULT)) &&
            MessageDigest.isEqual(passwordCandidate, Base64.decode(PASSWORD_VERIFIER, Base64.DEFAULT));
    }

    private byte[] pbkdf2(byte[] password, byte[] salt) throws Exception {
        return pbkdf2(password, salt, ITERATIONS);
    }

    private byte[] pbkdf2(byte[] password, byte[] salt, int rounds) throws Exception {
        if (rounds < 100000 || rounds > 1000000) throw new IllegalArgumentException("Invalid password work factor.");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(password, "HmacSHA256"));
        byte[] block = new byte[salt.length + 4];
        System.arraycopy(salt, 0, block, 0, salt.length);
        block[block.length - 1] = 1;
        byte[] u = mac.doFinal(block);
        byte[] result = u.clone();
        for (int round = 1; round < rounds; round++) {
            u = mac.doFinal(u);
            for (int i = 0; i < result.length; i++) result[i] ^= u[i];
        }
        return result;
    }

    private boolean saveDeveloperSession(boolean remember, String identifier, String password) {
        try {
            SharedPreferences.Editor editor = prefs().edit();
            if (remember) {
                JSONObject credentials = new JSONObject();
                credentials.put("version", 1);
                credentials.put("identifier", identifier.trim().toLowerCase(Locale.ROOT));
                credentials.put("password", password);
                byte[] encrypted = encrypt(credentials.toString().getBytes(StandardCharsets.UTF_8));
                editor.putString(PREF_CREDENTIALS, Base64.encodeToString(encrypted, Base64.NO_WRAP));
                editor.putString(PREF_IV, lastIv);
            } else {
                editor.remove(PREF_CREDENTIALS);
                editor.remove(PREF_IV);
            }
            // This is an active marker only. Pocket still presents Login Gate at cold start.
            editor.putString(PREF_PLAYER_SESSION_NAME, "");
            editor.putBoolean(PREF_SESSION, true);
            return editor.commit();
        } catch (Exception ignored) {
            return false;
        }
    }

    private byte[] encrypt(byte[] plain) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        lastIv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
        return cipher.doFinal(plain);
    }

    private byte[] decrypt(byte[] cipherText, String iv) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Base64.decode(iv, Base64.DEFAULT)));
        return cipher.doFinal(cipherText);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    @JavascriptInterface public String getRememberedDeveloperCredentials() {
        try {
            String stored = prefs().getString(PREF_CREDENTIALS, null);
            String iv = prefs().getString(PREF_IV, null);
            if (stored == null || iv == null) return "";
            byte[] plain = decrypt(Base64.decode(stored, Base64.DEFAULT), iv);
            JSONObject object = new JSONObject(new String(plain, StandardCharsets.UTF_8));
            if (object.optInt("version") != 1) return "";
            return object.toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public boolean isDeveloperSessionAuthorized() {
        return prefs().getBoolean(PREF_SESSION, false);
    }

    @JavascriptInterface public void lockDeveloperSession() {
        prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    @JavascriptInterface public void lockPlayerSession() {
        prefs().edit().putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    @JavascriptInterface public boolean isPlayerSessionAuthorized() {
        String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
        if (name.isEmpty() || prefs().getBoolean(PREF_SESSION, false)) return false;
        try { return hasMatchingPocketDeviceBinding(name); }
        catch (Exception ignored) { return false; }
    }

    @JavascriptInterface public String getActivePlayerSessionName() {
        return isPlayerSessionAuthorized() ? prefs().getString(PREF_PLAYER_SESSION_NAME, "") : "";
    }

    @JavascriptInterface public void clearRememberedDeveloperCredentials() {
        prefs().edit().remove(PREF_CREDENTIALS).remove(PREF_IV).putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    // Pocket stores the Universe character-name index locally; gameplay status is Pocket-owned.
    private JSONArray readCachedPlayerNames() throws Exception {
        JSONArray previous = new JSONArray(prefs().getString(PREF_LOCAL_PLAYERS, "[]"));
        JSONArray names = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject record = previous.optJSONObject(i);
            String name = record != null ? record.optString("name", "") : previous.optString(i, "");
            name = name.trim();
            if (!name.isEmpty() && seen.add(name)) names.put(name);
        }
        return names;
    }

    private JSONArray readPocketRegisteredPlayerNames() throws Exception {
        JSONArray previous = new JSONArray(prefs().getString(PREF_POCKET_PLAYERS, "[]"));
        JSONArray names = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < previous.length(); i++) {
            String name = previous.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) names.put(name);
        }
        return names;
    }

    private boolean containsExactName(JSONArray names, String candidate) {
        for (int i = 0; i < names.length(); i++) {
            if (candidate.equals(names.optString(i, ""))) return true;
        }
        return false;
    }

    private JSONArray combinePlayerNames(JSONArray first, JSONArray second) {
        JSONArray combined = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < first.length(); i++) {
            String name = first.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) combined.put(name);
        }
        for (int i = 0; i < second.length(); i++) {
            String name = second.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) combined.put(name);
        }
        return combined;
    }

    private void rememberPocketPlayerName(String name) {
        try {
            JSONArray previous = readPocketRegisteredPlayerNames();
            if (containsExactName(previous, name)) return;
            previous.put(name);
            prefs().edit().putString(PREF_POCKET_PLAYERS, previous.toString()).apply();
        } catch (Exception ignored) {
            // The current verified session remains valid if the local index cannot be written.
        }
    }


    private String pocketPlayerKey(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    private JSONObject readPocketPlayerProfileStore() {
        try {
            String encrypted = prefs().getString(PREF_PLAYER_PROFILES, null);
            String iv = prefs().getString(PREF_PLAYER_PROFILES_IV, null);
            if (encrypted != null && iv != null) {
                byte[] plain = decrypt(Base64.decode(encrypted, Base64.DEFAULT), iv);
                return new JSONObject(new String(plain, StandardCharsets.UTF_8));
            }
            return new JSONObject(prefs().getString(PREF_PLAYER_PROFILES, "{}"));
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    // Stable hidden profile key shared by a Player device and the Developer device.
    // The visible MZKSV1 save code remains random and rotates after each successful login.
    private String createPocketPlayerId(String playerName) throws Exception {
        String normalized = pocketPlayerKey(playerName);
        if (normalized.isEmpty()) throw new Exception("A Player name is required to derive the profile key.");
        byte[] seed = ("MERZKAVA-POCKET-PROFILE-V1:" + normalized).getBytes(StandardCharsets.UTF_8);
        return "profile-" + sha256Hex(seed).substring(0, 32).toUpperCase(Locale.ROOT);
    }

    private String randomSessionNonce() {
        byte[] random = new byte[16];
        new java.security.SecureRandom().nextBytes(random);
        return Base64.encodeToString(random, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private String sha256Hex(byte[] value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value);
        StringBuilder output = new StringBuilder(digest.length * 2);
        for (byte item : digest) output.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        return output.toString();
    }

    private byte[] deflateSavePayload(byte[] plain) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (DeflaterOutputStream stream = new DeflaterOutputStream(output, new Deflater(Deflater.BEST_COMPRESSION))) {
            stream.write(plain);
        }
        return output.toByteArray();
    }

    private byte[] inflateSavePayload(byte[] compressed) throws Exception {
        if (compressed.length == 0 || compressed.length > 4 * 1024 * 1024) {
            throw new Exception("Save code compressed data is outside the allowed size.");
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (InflaterInputStream stream = new InflaterInputStream(new ByteArrayInputStream(compressed))) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (output.size() + count > 8 * 1024 * 1024) {
                    throw new Exception("Save code expands beyond the allowed 8 MB limit.");
                }
                output.write(buffer, 0, count);
            }
        }
        return output.toByteArray();
    }

    private JSONObject buildPocketSaveEnvelope(JSONObject record, String profileKey, int generation, long issuedAt, String nonce) throws Exception {
        JSONObject envelope = new JSONObject();
        envelope.put("format", "MERZKAVA_POCKET_SAVE_V1");
        envelope.put("version", 1);
        envelope.put("player", new JSONObject()
            .put("name", record.optString("name", ""))
            .put("profileKey", profileKey));
        envelope.put("session", new JSONObject()
            .put("generation", generation)
            .put("issuedAt", issuedAt)
            .put("nonce", nonce)
            .put("resetEpoch", record.optInt("saveResetEpoch", 0)));
        JSONObject snapshot = new JSONObject(record.toString());
        snapshot.remove("ownerCredential");
        snapshot.remove("deviceBinding");
        snapshot.remove("identityRef");
        snapshot.remove("playerId");
        snapshot.remove("sessionSaveCode");
        snapshot.remove("sessionSaveNonce");
        snapshot.remove("sessionSaveGeneration");
        snapshot.remove("sessionSaveCodeIssuedAt");
        snapshot.remove("lastSavedSaveCode");
        snapshot.remove("lastSavedSnapshot");
        snapshot.remove("lastSavedSaveCodeGeneration");
        snapshot.remove("lastSavedSaveCodeIssuedAt");
        snapshot.remove("sessionSaveCodePresent");
        snapshot.remove("masterResetGrantHash");
        snapshot.remove("masterResetGrantVersion");
        snapshot.remove("masterResetGrantExpectedSaveEpoch");
        snapshot.remove("masterResetGrantIssuedAt");
        envelope.put("data", snapshot);
        return envelope;
    }

    private String encodePocketSaveCode(JSONObject envelope) throws Exception {
        byte[] plain = envelope.toString().getBytes(StandardCharsets.UTF_8);
        byte[] compressed = deflateSavePayload(plain);
        String body = Base64.encodeToString(compressed, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        return "MZKSV1." + body + "." + sha256Hex(compressed);
    }

    private JSONObject decodeAndValidatePocketSaveCode(String code) throws Exception {
        if (code == null || code.length() < 80 || code.length() > 6 * 1024 * 1024) {
            throw new Exception("Save code is empty or exceeds the 6 MB limit.");
        }
        String[] parts = code.trim().split("\\.", -1);
        if (parts.length != 3 || !"MZKSV1".equals(parts[0]) ||
            !parts[1].matches("[A-Za-z0-9_-]+") || !parts[2].matches("[a-fA-F0-9]{64}")) {
            throw new Exception("Invalid save code format. Expected MZKSV1.<compressed-data>.<SHA-256>.");
        }
        byte[] compressed;
        try {
            compressed = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_PADDING);
        } catch (Exception error) {
            throw new Exception("Save code payload is not valid Base64URL.");
        }
        if (!MessageDigest.isEqual(sha256Hex(compressed).getBytes(StandardCharsets.US_ASCII),
            parts[2].toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            throw new Exception("Save code checksum mismatch. The code may be cut off or altered.");
        }
        JSONObject envelope = new JSONObject(new String(inflateSavePayload(compressed), StandardCharsets.UTF_8));
        if (!"MERZKAVA_POCKET_SAVE_V1".equals(envelope.optString("format", "")) || envelope.optInt("version", 0) != 1) {
            throw new Exception("Unsupported Player save schema.");
        }
        JSONObject player = envelope.optJSONObject("player");
        JSONObject session = envelope.optJSONObject("session");
        JSONObject data = envelope.optJSONObject("data");
        if (player == null || session == null || data == null) throw new Exception("Save code is missing required Player, session or data sections.");
        String name = player.optString("name", "").trim();
        String profileKey = player.optString("profileKey", "");
        if (name.isEmpty() || name.length() > 80 || !profileKey.matches("profile-[A-Fa-f0-9]{32}") ||
            !name.equalsIgnoreCase(data.optString("name", ""))) {
            throw new Exception("Save code Player identity fields are invalid or inconsistent.");
        }
        if (session.optInt("generation", 0) < 1 || session.optLong("issuedAt", 0L) <= 0L ||
            session.optString("nonce", "").length() < 20 || session.optInt("resetEpoch", 0) < 0) {
            throw new Exception("Save code session metadata is incomplete.");
        }
        return envelope;
    }

    private String rotatePocketSessionSaveCode(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) throw new Exception("Player profile not found for this login.");
        String profileKey = ensurePocketPlayerId(record);
        int generation = record.optInt("sessionSaveGeneration", 0) + 1;
        long issuedAt = System.currentTimeMillis();
        String nonce = randomSessionNonce();
        record.put("sessionSaveGeneration", generation);
        record.put("sessionSaveCodeIssuedAt", issuedAt);
        record.put("sessionSaveNonce", nonce);
        record.put("sessionSaveCode", encodePocketSaveCode(buildPocketSaveEnvelope(record, profileKey, generation, issuedAt, nonce)));
        store.remove(pocketPlayerKey(name));
        store.put(profileKey, record);
        persistPocketPlayerProfileStore(store);
        return record.getString("sessionSaveCode");
    }

    private String ensurePocketPlayerId(JSONObject record) throws Exception {
        String name = record.optString("name", "").trim();
        String code = createPocketPlayerId(name);
        record.put("playerId", code);
        return code;
    }

    private JSONObject findPocketPlayerProfile(JSONObject store, String name) {
        if (store == null || name == null) return null;
        String expected = name.trim();
        Iterator<String> keys = store.keys();
        while (keys.hasNext()) {
            JSONObject record = store.optJSONObject(keys.next());
            if (record != null && expected.equalsIgnoreCase(record.optString("name", "").trim())) return record;
        }
        return store.optJSONObject(pocketPlayerKey(name));
    }

    private JSONObject persistPocketPlayerProfileStore(JSONObject store) throws Exception {
        JSONObject normalized = new JSONObject();
        Iterator<String> keys = store.keys();
        while (keys.hasNext()) {
            JSONObject record = store.optJSONObject(keys.next());
            if (record == null) continue;
            String playerId = ensurePocketPlayerId(record);
            normalized.put(playerId, record);
        }
        byte[] encrypted = encrypt(normalized.toString().getBytes(StandardCharsets.UTF_8));
        boolean saved = prefs().edit().putString(PREF_PLAYER_PROFILES, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(PREF_PLAYER_PROFILES_IV, lastIv).commit();
        if (!saved) throw new Exception("Could not save the Player profile.");
        return normalized;
    }

    private JSONObject createPocketOwnerCredential(String password) throws Exception {
        byte[] salt = new byte[16];
        new java.security.SecureRandom().nextBytes(salt);
        byte[] hash = pbkdf2(password.getBytes(StandardCharsets.UTF_8), salt, ITERATIONS);
        JSONObject credential = new JSONObject();
        credential.put("version", 1);
        credential.put("algorithm", "PBKDF2-HMAC-SHA256");
        credential.put("iterations", ITERATIONS);
        credential.put("salt", Base64.encodeToString(salt, Base64.NO_WRAP));
        credential.put("hash", Base64.encodeToString(hash, Base64.NO_WRAP));
        credential.put("createdAt", System.currentTimeMillis());
        credential.put("storage", "Android Keystore encrypted profile store");
        return credential;
    }

    private JSONObject createEmptyPocketPlayerProfile(String name) throws Exception {
        JSONObject profile = new JSONObject();
        profile.put("schemaVersion", 1);
        profile.put("name", name);
        profile.put("source", "Pocket local registration");
        profile.put("profileStatus", "provisioned");
        profile.put("lastSeenAt", JSONObject.NULL);
        JSONObject character = new JSONObject();
        character.put("age", JSONObject.NULL);
        character.put("origin", JSONObject.NULL);
        character.put("background", JSONObject.NULL);
        character.put("realm", JSONObject.NULL);
        character.put("cultivationLevel", JSONObject.NULL);
        character.put("awakened", JSONObject.NULL);
        profile.put("character", character);
        JSONObject assets = new JSONObject();
        assets.put("buildings", new JSONArray());
        profile.put("assets", assets);
        JSONObject relationships = new JSONObject();
        relationships.put("entries", new JSONArray());
        relationships.put("disposition", JSONObject.NULL);
        profile.put("relationships", relationships);
        profile.put("inventory", new JSONArray());
        JSONObject wealth = new JSONObject();
        wealth.put("xc", JSONObject.NULL);
        wealth.put("xs", JSONObject.NULL);
        wealth.put("xg", JSONObject.NULL);
        wealth.put("zj", JSONObject.NULL);
        wealth.put("az", JSONObject.NULL);
        wealth.put("total", JSONObject.NULL);
        profile.put("wealth", wealth);
        JSONObject achievements = new JSONObject();
        achievements.put("items", new JSONArray());
        JSONObject daily = new JSONObject();
        daily.put("currentStreak", JSONObject.NULL);
        daily.put("longestStreak", JSONObject.NULL);
        daily.put("totalClaims", JSONObject.NULL);
        daily.put("trackingStatus", "not-recorded");
        daily.put("lastClaimDate", JSONObject.NULL);
        daily.put("longestStreakDate", JSONObject.NULL);
        achievements.put("dailyLogin", daily);
        profile.put("achievements", achievements);
        JSONObject gameplay = new JSONObject();
        gameplay.put("status", "not-started");
        profile.put("gameplay", gameplay);
        return profile;
    }

    private String pocketPlayerDeviceAlias(String playerId) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(playerId.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder("mp-player-");
        for (byte item : digest) out.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        return out.toString();
    }

    private KeyStore pocketKeyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        return store;
    }

    private KeyPair getOrCreatePocketDeviceKey(String playerId) throws Exception {
        String alias = pocketPlayerDeviceAlias(playerId);
        KeyStore store = pocketKeyStore();
        if (store.containsAlias(alias)) {
            PrivateKey privateKey = (PrivateKey) store.getKey(alias, null);
            PublicKey publicKey = store.getCertificate(alias).getPublicKey();
            return new KeyPair(publicKey, privateKey);
        }
        KeyPairGenerator generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore");
        KeyGenParameterSpec specification = new KeyGenParameterSpec.Builder(alias,
            KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
            .build();
        generator.initialize(specification);
        return generator.generateKeyPair();
    }

    private String pocketDeviceFingerprint(PublicKey key) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getEncoded());
        StringBuilder out = new StringBuilder();
        for (byte item : digest) out.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        return out.toString();
    }

    private String pocketDeviceSecurityLevel(PrivateKey key) {
        try {
            KeyInfo info = KeyFactory.getInstance(key.getAlgorithm(), "AndroidKeyStore").getKeySpec(key, KeyInfo.class);
            return info.isInsideSecureHardware() ? "hardware-backed" : "Android Keystore";
        } catch (Exception ignored) {
            return "Android Keystore";
        }
    }

    private boolean hasMatchingPocketDeviceBinding(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) return false;
        String playerId = record.optString("playerId", "");
        if (!playerId.matches("profile-[A-Fa-f0-9]{32}")) return false;
        JSONObject binding = record.optJSONObject("deviceBinding");
        String expected = binding == null ? "" : binding.optString("publicKeySha256", "");
        if (expected.isEmpty()) return false;
        KeyStore keyStore = pocketKeyStore();
        String alias = pocketPlayerDeviceAlias(playerId);
        if (!keyStore.containsAlias(alias)) return false;
        KeyPair pair = getOrCreatePocketDeviceKey(playerId);
        return expected.equals(pocketDeviceFingerprint(pair.getPublic()));
    }

    private boolean verifyImportedOwnerPassword(String name, String password) throws Exception {
        JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
        JSONObject credential = record == null ? null : record.optJSONObject("ownerCredential");
        if (credential == null || credential.optInt("version", 0) != 1) return false;
        int rounds = credential.optInt("iterations", 0);
        String saltText = credential.optString("salt", "");
        String hashText = credential.optString("hash", "");
        if ((rounds != 310000 && rounds != ITERATIONS) || saltText.isEmpty() || hashText.isEmpty()) return false;
        byte[] salt = Base64.decode(saltText, Base64.DEFAULT);
        byte[] expected = Base64.decode(hashText, Base64.DEFAULT);
        byte[] actual = pbkdf2(password.getBytes(StandardCharsets.UTF_8), salt, rounds);
        return MessageDigest.isEqual(actual, expected);
    }

    private String enrollOrVerifyPocketDevice(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) throw new Exception("This player profile has not been imported from Merzkava APK.");
        String playerId = ensurePocketPlayerId(record);
        JSONObject binding = record.optJSONObject("deviceBinding");
        String expected = binding == null ? "" : binding.optString("publicKeySha256", "");
        String alias = pocketPlayerDeviceAlias(playerId);
        KeyStore keyStore = pocketKeyStore();
        if (!expected.isEmpty() && !keyStore.containsAlias(alias)) {
            throw new Exception("This account is already paired to another device. Ask the Developer to verify ownership and authorize a device transfer.");
        }
        KeyPair pair = getOrCreatePocketDeviceKey(playerId);
        String fingerprint = pocketDeviceFingerprint(pair.getPublic());
        if (!expected.isEmpty() && !expected.equals(fingerprint)) {
            throw new Exception("The device key does not match this account's registered owner device.");
        }

        // Prove that Android Keystore can still use the non-exportable private key.
        byte[] nonce = new byte[32];
        new java.security.SecureRandom().nextBytes(nonce);
        Signature signer = Signature.getInstance("SHA256withECDSA");
        signer.initSign(pair.getPrivate());
        signer.update(nonce);
        byte[] signed = signer.sign();
        Signature verifier = Signature.getInstance("SHA256withECDSA");
        verifier.initVerify(pair.getPublic());
        verifier.update(nonce);
        if (!verifier.verify(signed)) throw new Exception("The Pocket device-key proof could not be verified.");

        if (expected.isEmpty()) {
            JSONObject nextBinding = new JSONObject();
            nextBinding.put("publicKeySha256", fingerprint);
            nextBinding.put("enrolledAt", System.currentTimeMillis());
            nextBinding.put("securityLevel", pocketDeviceSecurityLevel(pair.getPrivate()));
            record.put("deviceBinding", nextBinding);
            store.put(playerId, record);
            persistPocketPlayerProfileStore(store);
        }
        return fingerprint;
    }


    @JavascriptInterface public String exportPocketPlayerProfiles() {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "";
        try {
            JSONObject bundle = new JSONObject();
            bundle.put("format", "MERZKAVA_PLAYER_DATA_V1");
            bundle.put("version", 1);
            bundle.put("createdAt", System.currentTimeMillis());
            bundle.put("players", new JSONArray(getPocketPlayerProfiles()));
            bundle.put("identityNote", "Player access is passwordless and verified against the current pinned Universe registry online. This bundle contains profile data only.");
            return bundle.toString();
        } catch (Exception ignored) { return ""; }
    }

    @JavascriptInterface public void registerPocketPlayerAccount(String characterName, String requestId) {
        // Registration and Player login share the same online identity + device enrollment flow.
        verifyPlayerIdentity(characterName, requestId);
    }

    @JavascriptInterface public String getPocketPlayerProfiles() {
        try {
            boolean developer = prefs().getBoolean(PREF_SESSION, false);
            String playerName = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            if (!developer && (playerName.isEmpty() || !hasMatchingPocketDeviceBinding(playerName))) return "[]";

            JSONObject store = readPocketPlayerProfileStore();
            JSONArray output = new JSONArray();
            if (!developer) {
                JSONObject own = findPocketPlayerProfile(store, playerName);
                if (own == null) return "[]";
                own = new JSONObject(own.toString());
                own.put("deviceBindingPresent", own.optJSONObject("deviceBinding") != null);
                own.remove("ownerCredential");
                own.remove("deviceBinding");
                own.remove("identityRef");
                own.remove("playerId");
                own.remove("masterResetGrantHash");
                own.remove("masterResetGrantVersion");
                own.remove("masterResetGrantExpectedSaveEpoch");
                own.remove("masterResetGrantIssuedAt");
                own.put("name", playerName);
                own.put("sessionSaveCodePresent", !own.optString("sessionSaveCode", "").isEmpty());
                output.put(own);
                return output.toString();
            }

            // Provision one stable Player ID for every known registry name before listing.
            JSONArray names = combinePlayerNames(readPocketRegisteredPlayerNames(), readCachedPlayerNames());
            Set<String> seenNames = ConcurrentHashMap.newKeySet();
            Set<String> emittedProfileKeys = ConcurrentHashMap.newKeySet();
            for (int index = 0; index < names.length(); index++) {
                String name = names.optString(index, "").trim();
                String normalizedName = pocketPlayerKey(name);
                if (name.isEmpty() || !seenNames.add(normalizedName)) continue;
                JSONObject record = findPocketPlayerProfile(store, name);
                if (record == null) record = createEmptyPocketPlayerProfile(name);
                record.put("name", name);
                String profileKey = ensurePocketPlayerId(record);
                JSONObject displayRecord = new JSONObject(record.toString());
                displayRecord.remove("ownerCredential");
                displayRecord.put("sessionSaveCodePresent", !record.optString("sessionSaveCode", "").isEmpty());
                displayRecord.put("sessionSaveCodeGeneration", record.optInt("sessionSaveGeneration", 0));
                displayRecord.put("savedSaveGeneration", record.optInt("lastSavedSaveCodeGeneration", 0));
                displayRecord.put("savedAt", record.optLong("lastSavedAt", 0L));
                displayRecord.put("masterResetGrantPresent", record.optString("masterResetGrantHash", "").matches("[a-fA-F0-9]{64}"));
                displayRecord.put("masterResetGrantVersion", record.optInt("masterResetGrantVersion", 0));
                displayRecord.put("masterResetExpectedEpoch", record.optInt("masterResetGrantExpectedSaveEpoch", 0));
                displayRecord.remove("masterResetGrantHash");
                displayRecord.remove("sessionSaveCode");
                displayRecord.remove("playerId");
                store.remove(pocketPlayerKey(name));
                store.put(profileKey, record);
                emittedProfileKeys.add(profileKey);
                output.put(displayRecord);
            }

            Iterator<String> keys = store.keys();
            while (keys.hasNext()) {
                JSONObject record = store.optJSONObject(keys.next());
                if (record == null) continue;
                String profileKey = ensurePocketPlayerId(record);
                JSONObject displayRecord = new JSONObject(record.toString());
                displayRecord.put("sessionSaveCodePresent", !record.optString("sessionSaveCode", "").isEmpty());
                displayRecord.put("sessionSaveCodeGeneration", record.optInt("sessionSaveGeneration", 0));
                displayRecord.put("savedSaveGeneration", record.optInt("lastSavedSaveCodeGeneration", 0));
                displayRecord.put("savedAt", record.optLong("lastSavedAt", 0L));
                displayRecord.remove("sessionSaveCode");
                displayRecord.remove("playerId");
                if (emittedProfileKeys.add(profileKey)) output.put(displayRecord);
            }
            persistPocketPlayerProfileStore(store);
            return output.toString();
        } catch (Exception ignored) {
            return "[]";
        }
    }

    @JavascriptInterface public String updatePocketPlayerEconomySnapshot(String playerName, String snapshotJson) {
        if (!isPlayerSessionAuthorized()) {
            return "{\"ok\":false,\"error\":\"A verified Player session is required.\"}";
        }
        String activeName = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
        if (playerName == null || !activeName.equalsIgnoreCase(playerName.trim())) {
            return "{\"ok\":false,\"error\":\"A Player can only attach the economy save to their own active profile.\"}";
        }
        if (snapshotJson == null || snapshotJson.trim().isEmpty() || snapshotJson.length() > 4 * 1024 * 1024) {
            return "{\"ok\":false,\"error\":\"The local economy snapshot is empty or exceeds the 4 MB limit.\"}";
        }
        try {
            JSONObject supplied = new JSONObject(snapshotJson);
            if (!"MERZKAVA_POCKET_ECONOMY_STATE_V1".equals(supplied.optString("format", ""))) {
                throw new Exception("Unsupported Pocket economy snapshot format.");
            }
            if (!activeName.equalsIgnoreCase(supplied.optString("playerName", ""))) {
                throw new Exception("The economy snapshot belongs to a different Player name.");
            }
            int version = supplied.optInt("schemaVersion", 0);
            if (version < 1 || version > 6) throw new Exception("Unsupported Pocket economy schema version.");
            JSONObject state = supplied.optJSONObject("state");
            if (state == null) throw new Exception("The economy snapshot has no state object.");
            JSONObject inventory = state.optJSONObject("inventory");
            JSONObject facilities = state.optJSONObject("facilities");
            JSONArray processes = state.optJSONArray("processes");
            JSONArray ledger = state.optJSONArray("ledger");
            JSONObject saveMeta = state.optJSONObject("save_meta");
            if (inventory == null || facilities == null || processes == null || ledger == null || saveMeta == null) {
                throw new Exception("The save is missing inventory, facilities, processes, ledger or save metadata.");
            }
            if (processes.length() > 1000 || ledger.length() > 5000 ||
                inventory.length() > 3000 || facilities.length() > 500) {
                throw new Exception("The economy snapshot exceeds Pocket's supported record counts.");
            }

            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, activeName);
            if (record == null) throw new Exception("The active Player profile could not be found.");
            String profileKey = ensurePocketPlayerId(record);
            record.put("pocketEconomy", state);
            record.put("pocketEconomySchemaVersion", version);
            record.put("pocketEconomySavedAt", System.currentTimeMillis());
            store.remove(pocketPlayerKey(activeName));
            store.put(profileKey, record);
            persistPocketPlayerProfileStore(store);

            JSONObject response = new JSONObject();
            response.put("ok", true);
            response.put("name", activeName);
            response.put("schemaVersion", version);
            response.put("savedAt", System.currentTimeMillis());
            response.put("processes", processes.length());
            response.put("inventoryTypes", inventory.length());
            response.put("buildings", facilities.length());
            return response.toString();
        } catch (Exception error) {
            try {
                return new JSONObject().put("ok", false)
                    .put("error", error.getMessage() == null ? "Could not save Pocket economy snapshot." : error.getMessage())
                    .toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"error\":\"Could not save Pocket economy snapshot.\"}";
            }
        }
    }

    @JavascriptInterface public String refreshCurrentPlayerSessionSaveCode() {
        if (!isPlayerSessionAuthorized()) return "";
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            return rotatePocketSessionSaveCode(name);
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public String getCurrentPlayerSessionSaveCode() {
        if (!isPlayerSessionAuthorized()) return "";
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
            if (record == null) return "";
            String code = record.optString("sessionSaveCode", "");
            return code.startsWith("MZKSV1.") && code.length() <= 6 * 1024 * 1024 ? code : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public long getCurrentPlayerSessionSaveCodeIssuedAt() {
        if (!isPlayerSessionAuthorized()) return 0L;
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
            return record == null ? 0L : record.optLong("sessionSaveCodeIssuedAt", 0L);
        } catch (Exception ignored) {
            return 0L;
        }
    }

    @JavascriptInterface public boolean isCurrentPlayerSaveCode(String playerName, String suppliedCode) {
        if (playerName == null || suppliedCode == null) return false;
        try {
            JSONObject envelope = decodeAndValidatePocketSaveCode(suppliedCode);
            JSONObject player = envelope.optJSONObject("player");
            if (player == null || !playerName.trim().equalsIgnoreCase(player.optString("name", ""))) return false;
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), playerName);
            if (record == null) return false;
            String localKey = ensurePocketPlayerId(record);
            return localKey.equals(player.optString("profileKey", "")) &&
                envelope.getJSONObject("session").optInt("generation", 0) >
                    record.optInt("lastSavedSaveCodeGeneration", 0);
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface public String savePocketPlayerCodeForName(String selectedPlayerName, String suppliedCode) {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "{\"ok\":false,\"error\":\"Developer authorization is required.\"}";
        if (selectedPlayerName == null || selectedPlayerName.trim().isEmpty()) return "{\"ok\":false,\"error\":\"Choose a Player profile first.\"}";
        try {
            JSONObject envelope = decodeAndValidatePocketSaveCode(suppliedCode);
            JSONObject identity = envelope.getJSONObject("player");
            String codeName = identity.getString("name").trim();
            if (!selectedPlayerName.trim().equalsIgnoreCase(codeName)) {
                throw new Exception("The save code belongs to " + codeName + ", not " + selectedPlayerName + ".");
            }
            JSONObject data = envelope.getJSONObject("data");
            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, selectedPlayerName);
            if (record == null) record = createEmptyPocketPlayerProfile(selectedPlayerName);
            String profileKey = ensurePocketPlayerId(record);
            String codeProfileKey = identity.optString("profileKey", "");
            if (!profileKey.equals(codeProfileKey)) {
                throw new Exception("The save code belongs to a different underlying Player profile. No data was changed.");
            }
            // This snapshot is created on the Player's device and transferred to this Developer device.
            // Validate its portable identity and monotonic session, not this device's local code cache.
            String[] allowed = {
                "name", "source", "profileStatus", "character", "stats", "assets", "relationships",
                "inventory", "wealth", "wallet", "walletLedger", "achievements", "gameplay",
                "pocketEconomy", "pocketEconomySchemaVersion", "pocketEconomySavedAt",
                "profileMarkdown", "characterId", "lastSeenAt"
            };
            for (String key : allowed) {
                if (data.has(key)) record.put(key, data.get(key));
            }
            record.put("name", selectedPlayerName.trim());
            int incomingGeneration = envelope.getJSONObject("session").optInt("generation", 0);
            int incomingResetEpoch = envelope.getJSONObject("session").optInt("resetEpoch", 0);
            int requiredResetEpoch = record.optInt("masterResetGrantExpectedSaveEpoch", record.optInt("saveResetEpoch", 0));
            int previouslySavedGeneration = record.optInt("lastSavedSaveCodeGeneration", 0);
            if (incomingResetEpoch < requiredResetEpoch) {
                throw new Exception("This save belongs to the pre-reset game. The Player must send a fresh code after using Master Reset.");
            }
            if (incomingGeneration <= previouslySavedGeneration) {
                throw new Exception("This save code is older than or equal to the last accepted session for this Player.");
            }
            record.put("saveResetEpoch", incomingResetEpoch);
            if (incomingResetEpoch >= record.optInt("masterResetGrantExpectedSaveEpoch", Integer.MAX_VALUE)) {
                record.remove("masterResetGrantHash");
                record.remove("masterResetGrantExpectedSaveEpoch");
            }
            record.put("saveResetEpoch", incomingResetEpoch);
            if (incomingResetEpoch >= record.optInt("masterResetGrantExpectedSaveEpoch", Integer.MAX_VALUE)) {
                record.remove("masterResetGrantHash");
                record.remove("masterResetGrantExpectedSaveEpoch");
            }
            record.put("lastSavedSaveCode", suppliedCode.trim());
            record.put("lastSavedSaveCodeGeneration", incomingGeneration);
            record.put("lastSavedSaveCodeIssuedAt", envelope.getJSONObject("session").optLong("issuedAt", 0L));
            record.put("lastSavedAt", System.currentTimeMillis());
            JSONObject safeSnapshot = new JSONObject(data.toString());
            record.put("lastSavedSnapshot", safeSnapshot);
            store.remove(pocketPlayerKey(selectedPlayerName));
            store.put(profileKey, record);
            persistPocketPlayerProfileStore(store);

            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("name", selectedPlayerName.trim());
            result.put("session", envelope.getJSONObject("session").optInt("generation", 0));
            result.put("savedAt", System.currentTimeMillis());
            result.put("profileKey", profileKey);
            result.put("checksumVerified", true);
            return result.toString();
        } catch (Exception error) {
            try { return new JSONObject().put("ok", false)
                .put("error", error.getMessage() == null ? "Save code could not be validated." : error.getMessage()).toString(); }
            catch (Exception ignored) { return "{\"ok\":false,\"error\":\"Save code could not be validated.\"}"; }
        }
    }

    @JavascriptInterface public String exportPocketPlayerSaveDirectory() {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "";
        try {
            JSONObject store = readPocketPlayerProfileStore();
            JSONArray players = new JSONArray();
            Iterator<String> keys = store.keys();
            while (keys.hasNext()) {
                JSONObject record = store.optJSONObject(keys.next());
                if (record == null) continue;
                String name = record.optString("name", "").trim();
                if (name.isEmpty()) continue;
                String savedCode = record.optString("lastSavedSaveCode", "");
                JSONObject snapshot = record.optJSONObject("lastSavedSnapshot");
                if (savedCode.isEmpty() || snapshot == null) continue;
                JSONObject savedEnvelope = decodeAndValidatePocketSaveCode(savedCode);
                JSONObject savedIdentity = savedEnvelope.getJSONObject("player");
                int requiredEpoch = record.optInt("masterResetGrantExpectedSaveEpoch", record.optInt("saveResetEpoch", 0));
                int savedEpoch = savedEnvelope.getJSONObject("session").optInt("resetEpoch", 0);
                if (!name.equalsIgnoreCase(savedIdentity.optString("name", "")) ||
                    !ensurePocketPlayerId(record).equals(savedIdentity.optString("profileKey", "")) ||
                    savedEpoch < requiredEpoch) {
                    continue;
                }
                JSONObject item = new JSONObject();
                item.put("name", name);
                item.put("code", savedCode);
                item.put("session", record.optInt("lastSavedSaveCodeGeneration", 0));
                item.put("savedAt", record.optLong("lastSavedAt", 0L));
                item.put("data", snapshot);
                players.put(item);
            }
            JSONObject bundle = new JSONObject();
            bundle.put("format", "MERZKAVA_POCKET_SAVE_DIRECTORY_V1");
            bundle.put("version", 1);
            bundle.put("exportedAt", System.currentTimeMillis());
            bundle.put("checksumAlgorithm", "SHA-256 per embedded MZKSV1 save code");
            bundle.put("players", players);
            JSONArray resetGrants = new JSONArray();
            Iterator<String> grantKeys = store.keys();
            while (grantKeys.hasNext()) {
                JSONObject record = store.optJSONObject(grantKeys.next());
                if (record == null) continue;
                String grantHash = record.optString("masterResetGrantHash", "");
                if (!grantHash.matches("[a-fA-F0-9]{64}")) continue;
                JSONObject grant = new JSONObject();
                grant.put("playerName", record.optString("name", ""));
                grant.put("profileKey", ensurePocketPlayerId(record));
                grant.put("sha256", grantHash.toLowerCase(Locale.ROOT));
                grant.put("version", record.optInt("masterResetGrantVersion", 1));
                grant.put("expectedSaveEpoch", record.optInt("masterResetGrantExpectedSaveEpoch", 1));
                grant.put("issuedAt", record.optLong("masterResetGrantIssuedAt", 0L));
                resetGrants.put(grant);
            }
            bundle.put("masterResetGrants", resetGrants);
            bundle.put("masterResetAssetPath", "review-apk/app/src/main/assets/player-master-reset-grants.json");
            return bundle.toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public String lookupPocketPlayerBySessionSaveCode(String suppliedCode) {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "{\"ok\":false,\"error\":\"Developer authorization is required.\"}";
        try {
            JSONObject envelope = decodeAndValidatePocketSaveCode(suppliedCode);
            JSONObject identity = envelope.getJSONObject("player");
            JSONObject session = envelope.getJSONObject("session");
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), identity.getString("name"));
            if (record == null) {
                throw new Exception("The selected Player does not exist in the Developer's local directory.");
            }
            if (!ensurePocketPlayerId(record).equals(identity.optString("profileKey", ""))) {
                throw new Exception("Player identity key mismatch. This save code does not belong to the matched profile.");
            }
            int requiredEpoch = record.optInt("masterResetGrantExpectedSaveEpoch", record.optInt("saveResetEpoch", 0));
            if (session.optInt("resetEpoch", 0) < requiredEpoch) {
                throw new Exception("This save code belongs to the game before Master Reset.");
            }
            if (session.optInt("generation", 0) <= record.optInt("lastSavedSaveCodeGeneration", 0)) {
                throw new Exception("This save code's session has already been saved or is older than the latest accepted save.");
            }
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("name", identity.getString("name"));
            result.put("session", session.optInt("generation", 0));
            result.put("issuedAt", session.optLong("issuedAt", 0L));
            result.put("checksumVerified", true);
            result.put("currentSession", true);
            return result.toString();
        } catch (Exception error) {
            try { return new JSONObject().put("ok", false)
                .put("error", error.getMessage() == null ? "Save code is invalid." : error.getMessage()).toString(); }
            catch (Exception ignored) { return "{\"ok\":false,\"error\":\"Save code is invalid.\"}"; }
        }
    }

    @JavascriptInterface public String importPocketPlayerProfiles(String bundleJson) {
        if (!prefs().getBoolean(PREF_SESSION, false)) {
            try { return new JSONObject().put("ok", false).put("error", "Developer authorization is required.").toString(); }
            catch (Exception ignored) { return "{}"; }
        }
        if (bundleJson == null || bundleJson.trim().isEmpty() || bundleJson.length() > 4194304) {
            try { return new JSONObject().put("ok", false).put("error", "Transfer data is empty or exceeds the 4 MB limit.").toString(); }
            catch (Exception ignored) { return "{}"; }
        }
        try {
            JSONObject bundle = new JSONObject(bundleJson);
            if (!"MERZKAVA_PLAYER_DATA_V1".equals(bundle.optString("format", ""))) {
                return new JSONObject().put("ok", false).put("error", "Unsupported transfer format. Export the MERZKAVA_PLAYER_DATA_V1 bundle from Merzkava APK.").toString();
            }
            JSONArray incoming = bundle.optJSONArray("players");
            if (incoming == null || incoming.length() == 0 || incoming.length() > 500) {
                return new JSONObject().put("ok", false).put("error", "The bundle must contain 1–500 player records.").toString();
            }
            JSONObject store = readPocketPlayerProfileStore();
            JSONArray localNames = readPocketRegisteredPlayerNames();
            int imported = 0;
            int skipped = 0;
            for (int index = 0; index < incoming.length(); index++) {
                JSONObject source = incoming.optJSONObject(index);
                if (source == null) { skipped++; continue; }
                String name = source.optString("name", "").trim();
                boolean invalid = name.isEmpty() || name.length() > 80;
                for (int c = 0; !invalid && c < name.length(); c++) {
                    if (Character.isISOControl(name.charAt(c))) invalid = true;
                }
                if (invalid) { skipped++; continue; }

                JSONObject oldRecord = findPocketPlayerProfile(store, name);
                JSONObject record = new JSONObject(source.toString());
                record.remove("ownerCredential");
                if (oldRecord != null) {
                    if (oldRecord.optJSONObject("deviceBinding") != null && record.optJSONObject("deviceBinding") == null) {
                        record.put("deviceBinding", oldRecord.optJSONObject("deviceBinding"));
                    }
                    String existingId = oldRecord.optString("playerId", "");
                    if (existingId.matches("profile-[A-Fa-f0-9]{32}")) record.put("playerId", existingId);
                    // Preserve Pocket's local game save and validated backup when refreshing APK profile data.
                    String[] pocketFields = {
                        "pocketEconomy", "pocketEconomySchemaVersion", "pocketEconomySavedAt",
                        "lastSavedSaveCode", "lastSavedSnapshot", "lastSavedSaveCodeGeneration",
                        "lastSavedSaveCodeIssuedAt", "lastSavedAt", "saveResetEpoch",
                        "masterResetGrantHash", "masterResetGrantVersion",
                        "masterResetGrantExpectedSaveEpoch", "masterResetGrantIssuedAt",
                        "lastGameResetAt"
                    };
                    for (String field : pocketFields) {
                        if (oldRecord.has(field) && !record.has(field)) record.put(field, oldRecord.get(field));
                    }
                    // Keep only this installation's active code; it is regenerated on next Player login.
                    if (oldRecord.has("sessionSaveCode")) {
                        record.put("sessionSaveCode", oldRecord.optString("sessionSaveCode", ""));
                        record.put("sessionSaveGeneration", oldRecord.optInt("sessionSaveGeneration", 0));
                        record.put("sessionSaveCodeIssuedAt", oldRecord.optLong("sessionSaveCodeIssuedAt", 0L));
                    } else {
                        record.remove("sessionSaveCode");
                        record.remove("sessionSaveGeneration");
                        record.remove("sessionSaveCodeIssuedAt");
                    }
                } else {
                    record.remove("sessionSaveCode");
                    record.remove("sessionSaveGeneration");
                    record.remove("sessionSaveCodeIssuedAt");
                }
                // Display-only state is recalculated by the live Developer directory.
                record.remove("sessionSaveCodePresent");
                record.remove("sessionSaveCodeGeneration");
                record.put("schemaVersion", 1);
                record.put("name", name);
                String playerId = ensurePocketPlayerId(record);
                record.put("source", "Merzkava APK");
                record.put("profileStatus", "imported");
                record.put("importedAt", System.currentTimeMillis());
                store.remove(pocketPlayerKey(name));
                store.put(playerId, record);
                if (!containsExactName(localNames, name)) localNames.put(name);
                imported++;
            }
            if (imported == 0) {
                return new JSONObject().put("ok", false).put("error", "No valid player profile could be imported; existing Pocket records were left unchanged.").toString();
            }
            persistPocketPlayerProfileStore(store);
            prefs().edit().putString(PREF_POCKET_PLAYERS, localNames.toString()).apply();
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("imported", imported);
            result.put("skipped", skipped);
            result.put("format", "MERZKAVA_PLAYER_DATA_V1");
            return result.toString();
        } catch (Exception error) {
            try { return new JSONObject().put("ok", false).put("error", "Could not read transfer data: " + error.getMessage()).toString(); }
            catch (Exception ignored) { return "{}"; }
        }
    }

    private String masterResetError(String message) {
        try {
            return new JSONObject().put("ok", false).put("error", message).toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    private JSONArray readUsedMasterResetHashes() {
        try { return new JSONArray(prefs().getString(PREF_USED_MASTER_RESET_GRANTS, "[]")); }
        catch (Exception ignored) { return new JSONArray(); }
    }

    private boolean usedMasterResetHash(String hash) {
        JSONArray used = readUsedMasterResetHashes();
        for (int i = 0; i < used.length(); i++) {
            if (hash.equals(used.optString(i, ""))) return true;
        }
        return false;
    }

    private JSONObject findBundledMasterResetGrant(String playerName, String code) throws Exception {
        if (code == null || !code.trim().matches("(?i)MZK-R-[A-F0-9]{48}")) {
            throw new Exception("Invalid reset-code format. Enter the complete MZK-R code.");
        }
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, playerName);
        if (record == null) throw new Exception("Your local Player profile could not be found.");
        String profileKey = ensurePocketPlayerId(record);
        String hash = sha256Hex(code.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
        if (usedMasterResetHash(hash)) throw new Exception("This Master Reset code has already been used.");
        JSONObject manifest;
        try (InputStream input = activity.getAssets().open("player-master-reset-grants.json");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (output.size() + count > 2 * 1024 * 1024) throw new Exception("The bundled Master Reset manifest is too large.");
                output.write(buffer, 0, count);
            }
            manifest = new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception error) {
            throw new Exception("This build does not contain a Player Master Reset grant. Install the build prepared for your account.");
        }
        if (!"MERZKAVA_POCKET_MASTER_RESET_GRANTS_V1".equals(manifest.optString("format", ""))) {
            throw new Exception("This build's Master Reset manifest has an unsupported format.");
        }
        JSONArray grants = manifest.optJSONArray("grants");
        if (grants == null) throw new Exception("This build has no Master Reset grant list.");
        for (int i = 0; i < grants.length(); i++) {
            JSONObject grant = grants.optJSONObject(i);
            if (grant == null) continue;
            if (profileKey.equalsIgnoreCase(grant.optString("profileKey", "")) &&
                playerName.equalsIgnoreCase(grant.optString("playerName", "")) &&
                MessageDigest.isEqual(hash.getBytes(StandardCharsets.US_ASCII),
                    grant.optString("sha256", "").toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
                int expectedEpoch = grant.optInt("expectedSaveEpoch", -1);
                if (expectedEpoch < 1 || expectedEpoch != record.optInt("saveResetEpoch", 0) + 1) {
                    throw new Exception("This reset grant does not match the current save generation for your Player.");
                }
                return grant;
            }
        }
        throw new Exception("This reset code is not assigned to your Player in this installed build.");
    }

    @JavascriptInterface public boolean validatePocketMasterResetCode(String code) {
        if (!isPlayerSessionAuthorized()) return false;
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            findBundledMasterResetGrant(name, code);
            return true;
        } catch (Exception ignored) { return false; }
    }

    @JavascriptInterface public String createPocketMasterResetGrant(String playerName) {
        if (!prefs().getBoolean(PREF_SESSION, false)) return masterResetError("Developer authorization is required.");
        if (playerName == null || playerName.trim().isEmpty()) return masterResetError("Choose a Player first.");
        try {
            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, playerName.trim());
            if (record == null) record = createEmptyPocketPlayerProfile(playerName.trim());
            record.put("name", playerName.trim());
            String profileKey = ensurePocketPlayerId(record);
            byte[] random = new byte[24];
            new java.security.SecureRandom().nextBytes(random);
            StringBuilder raw = new StringBuilder("MZK-R-");
            for (byte item : random) raw.append(String.format(Locale.ROOT, "%02X", item & 0xff));
            String code = raw.toString();
            String hash = sha256Hex(code.getBytes(StandardCharsets.UTF_8));
            int version = record.optInt("masterResetGrantVersion", 0) + 1;
            int expectedEpoch = record.optInt("saveResetEpoch", 0) + 1;
            long issuedAt = System.currentTimeMillis();
            record.put("masterResetGrantHash", hash);
            record.put("masterResetGrantVersion", version);
            record.put("masterResetGrantExpectedSaveEpoch", expectedEpoch);
            record.put("masterResetGrantIssuedAt", issuedAt);
            store.remove(pocketPlayerKey(playerName.trim()));
            store.put(profileKey, record);
            persistPocketPlayerProfileStore(store);
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("playerName", playerName.trim());
            result.put("code", code);
            result.put("profileKey", profileKey);
            result.put("grantVersion", version);
            result.put("expectedSaveEpoch", expectedEpoch);
            result.put("issuedAt", issuedAt);
            result.put("note", "Keep the code private. The build update receives only its SHA-256 hash.");
            return result.toString();
        } catch (Exception error) {
            return masterResetError(error.getMessage() == null ? "Could not issue the Player Master Reset code." : error.getMessage());
        }
    }

    @JavascriptInterface public String exportPocketMasterResetGrantManifest() {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "";
        try {
            JSONObject store = readPocketPlayerProfileStore();
            JSONArray grants = new JSONArray();
            Iterator<String> keys = store.keys();
            while (keys.hasNext()) {
                JSONObject record = store.optJSONObject(keys.next());
                if (record == null) continue;
                String hash = record.optString("masterResetGrantHash", "");
                if (!hash.matches("[a-fA-F0-9]{64}")) continue;
                JSONObject item = new JSONObject();
                item.put("playerName", record.optString("name", ""));
                item.put("profileKey", ensurePocketPlayerId(record));
                item.put("sha256", hash.toLowerCase(Locale.ROOT));
                item.put("version", record.optInt("masterResetGrantVersion", 1));
                item.put("expectedSaveEpoch", record.optInt("masterResetGrantExpectedSaveEpoch", 1));
                item.put("issuedAt", record.optLong("masterResetGrantIssuedAt", 0L));
                grants.put(item);
            }
            JSONObject manifest = new JSONObject();
            manifest.put("format", "MERZKAVA_POCKET_MASTER_RESET_GRANTS_V1");
            manifest.put("version", 1);
            manifest.put("generatedAt", System.currentTimeMillis());
            manifest.put("grants", grants);
            return manifest.toString();
        } catch (Exception ignored) { return ""; }
    }

    @JavascriptInterface public String redeemPocketMasterResetCode(String code) {
        if (!isPlayerSessionAuthorized()) return masterResetError("A verified Player session is required.");
        try {
            String playerName = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            JSONObject grant = findBundledMasterResetGrant(playerName, code);
            String hash = sha256Hex(code.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, playerName);
            if (record == null) throw new Exception("Your Player profile could not be loaded.");
            int expectedEpoch = grant.optInt("expectedSaveEpoch", record.optInt("saveResetEpoch", 0) + 1);

            // Clear Pocket game progress only. Keep Player name, local registration, device binding and active login.
            String[] resetFields = {
                "pocketEconomy", "pocketEconomySchemaVersion", "pocketEconomySavedAt",
                "assets", "relationships", "inventory", "inventoryItems", "wealth", "wallet",
                "walletLedger", "achievements", "dailyLogin", "gameplay",
                "lastSavedSaveCode", "lastSavedSnapshot", "lastSavedSaveCodeGeneration",
                "lastSavedSaveCodeIssuedAt", "lastSavedAt"
            };
            for (String field : resetFields) record.remove(field);
            record.put("assets", new JSONObject().put("buildings", new JSONArray()));
            record.put("relationships", new JSONObject().put("entries", new JSONArray()));
            record.put("inventory", new JSONArray());
            record.put("wealth", new JSONObject().put("xc", 0).put("xs", 0).put("xg", 0).put("zj", 0).put("az", 0));
            record.put("achievements", new JSONObject().put("items", new JSONArray())
                .put("dailyLogin", new JSONObject().put("currentStreak", 0).put("longestStreak", 0).put("totalClaims", 0)));
            record.put("gameplay", new JSONObject().put("status", "new-game"));
            record.put("profileStatus", "active");
            record.put("saveResetEpoch", expectedEpoch);
            record.put("lastGameResetAt", System.currentTimeMillis());
            record.remove("masterResetGrantHash");
            record.remove("masterResetGrantExpectedSaveEpoch");
            JSONArray used = readUsedMasterResetHashes();
            used.put(hash);
            String profileKey = ensurePocketPlayerId(record);
            store.remove(pocketPlayerKey(playerName));
            store.put(profileKey, record);
            byte[] encrypted = encrypt(store.toString().getBytes(StandardCharsets.UTF_8));
            boolean committed = prefs().edit()
                .putString(PREF_PLAYER_PROFILES, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .putString(PREF_PLAYER_PROFILES_IV, lastIv)
                .putString(PREF_USED_MASTER_RESET_GRANTS, used.toString())
                .commit();
            if (!committed) throw new Exception("Could not atomically apply and consume the one-time Master Reset grant.");
            String newCode = rotatePocketSessionSaveCode(playerName);
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("name", playerName);
            result.put("saveResetEpoch", expectedEpoch);
            result.put("newSessionCodeIssued", newCode.startsWith("MZKSV1."));
            result.put("message", "Pocket game save reset. Your Player account and device registration remain active.");
            return result.toString();
        } catch (Exception error) {
            return masterResetError(error.getMessage() == null ? "Master Reset could not be completed." : error.getMessage());
        }
    }

    @JavascriptInterface public boolean resetPocketPlayerDeviceBinding(String playerName) {
        if (!prefs().getBoolean(PREF_SESSION, false) || playerName == null || playerName.trim().isEmpty()) return false;
        try {
            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, playerName);
            if (record == null) return false;
            String playerId = ensurePocketPlayerId(record);
            pocketKeyStore().deleteEntry(pocketPlayerDeviceAlias(playerId));
            record.remove("deviceBinding");
            store.remove(pocketPlayerKey(playerName));
            store.put(playerId, record);
            persistPocketPlayerProfileStore(store);
            return true;
        } catch (Exception ignored) { return false; }
    }

    @JavascriptInterface public String getPocketRegisteredPlayerNames() {
        try { return readPocketRegisteredPlayerNames().toString(); }
        catch (Exception ignored) { return "[]"; }
    }

    @JavascriptInterface public String getLocalPlayerNames() {
        try {
            return combinePlayerNames(readPocketRegisteredPlayerNames(), readCachedPlayerNames()).toString();
        } catch (Exception ignored) { return "[]"; }
    }

    // Backward-compatible bridge name for older web bundles; the payload is names only.
    @JavascriptInterface public String getLocalPlayerProfiles() {
        return getLocalPlayerNames();
    }

    private void rememberPlayerRegistry(JSONArray names, String sha) {
        try {
            JSONArray next = new JSONArray();
            Set<String> seen = ConcurrentHashMap.newKeySet();
            for (int i = 0; i < names.length(); i++) {
                String name = names.optString(i, "").trim();
                if (name.isEmpty() || !seen.add(name)) continue;
                JSONObject record = new JSONObject();
                record.put("name", name);
                record.put("source", "universe");
                record.put("sourceSha", sha);
                next.put(record);
            }
            prefs().edit().putString(PREF_LOCAL_PLAYERS, next.toString())
                .putString(PREF_REGISTRY_SHA, sha)
                .putLong(PREF_REGISTRY_AT, System.currentTimeMillis()).apply();
        } catch (Exception ignored) {
            // Registry verification still succeeds for this session if local indexing fails.
        }
    }

    @JavascriptInterface public void verifyPlayerIdentity(String characterName, String requestId) {
        // Player access is name + mandatory online Universe pin/players.md verification.
        // No Player password is requested or compared.
        prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
        if (requestId == null || characterName == null || characterName.trim().isEmpty()) {
            completePlayer(requestId, false, "", "", "Enter the exact registered character name.");
            return;
        }
        final String requestedName = characterName.trim();
        if (requestedName.length() > 80) {
            completePlayer(requestId, false, "", "", "The character name is too long.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                String readme = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/main/README.md");
                String marker = "Latest pinned source:";
                int markerIndex = readme.indexOf(marker);
                if (markerIndex < 0) throw new Exception("The Universe source pin could not be verified.");
                String remainder = readme.substring(markerIndex + marker.length());
                int opening = remainder.indexOf((char)96);
                int closing = opening < 0 ? -1 : remainder.indexOf((char)96, opening + 1);
                if (opening < 0 || closing <= opening + 1) throw new Exception("The Universe source pin could not be verified.");
                String shortSha = remainder.substring(opening + 1, closing).trim();
                if (!shortSha.matches("[a-fA-F0-9]{7,40}")) throw new Exception("The Universe source pin is malformed.");

                String commitJson = fetch("https://api.github.com/repos/" + UNIVERSE + "/commits/" + shortSha);
                String fullSha = new JSONObject(commitJson).getString("sha");
                if (!fullSha.matches("[a-fA-F0-9]{40}")) throw new Exception("The pinned Universe commit could not be verified.");

                String registry = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/" + fullSha + "/players.md");
                if (cancelledRequests.contains(requestId)) return;

                JSONArray registeredNames = new JSONArray();
                boolean exactMatch = false;
                Pattern rowPattern = Pattern.compile("^\\|\\s*([^|]+?)\\s*\\|\\s*\\[[^\\]]+\\]\\(players/[^)]+\\)", Pattern.MULTILINE);
                Matcher rows = rowPattern.matcher(registry);
                while (rows.find()) {
                    String registeredName = rows.group(1).trim();
                    if (registeredName.isEmpty()) continue;
                    registeredNames.put(registeredName);
                    if (requestedName.equals(registeredName)) exactMatch = true;
                }
                if (cancelledRequests.contains(requestId)) return;
                boolean localMatch = containsExactName(readPocketRegisteredPlayerNames(), requestedName)
                    || containsExactName(readCachedPlayerNames(), requestedName);
                rememberPlayerRegistry(registeredNames, fullSha);
                if (!exactMatch && !localMatch) {
                    completePlayer(requestId, false, "", fullSha,
                        "The character identity could not be verified in Merzkava Universe. Check the name and try again.");
                    return;
                }

                JSONObject store = readPocketPlayerProfileStore();
                JSONObject player = findPocketPlayerProfile(store, requestedName);
                if (player == null) player = createEmptyPocketPlayerProfile(requestedName);
                player.put("name", requestedName);
                player.put("lastSeenAt", System.currentTimeMillis());
                player.put("source", player.optString("source", "Universe identity check"));
                if (!"imported".equals(player.optString("profileStatus", ""))) player.put("profileStatus", "active");
                String profileKey = ensurePocketPlayerId(player);
                store.remove(pocketPlayerKey(requestedName));
                store.put(profileKey, player);
                persistPocketPlayerProfileStore(store);
                rememberPocketPlayerName(requestedName);

                // First successful login enrolls this device. Later logins require the same KeyStore key.
                String deviceFingerprint = enrollOrVerifyPocketDevice(requestedName);
                String saveCode = rotatePocketSessionSaveCode(requestedName);
                prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, requestedName).apply();
                String source = exactMatch && localMatch ? "pocket-local+universe"
                    : exactMatch ? "universe" : "pocket-local";
                completePlayer(requestId, true, requestedName,
                    source + ":" + fullSha + ":device:" + deviceFingerprint + ":save:" + sha256Hex(saveCode.getBytes(StandardCharsets.UTF_8)), "");
            } catch (Exception error) {
                if (!cancelledRequests.contains(requestId)) {
                    String message = error.getMessage();
                    completePlayer(requestId, false, "", "", "Character verification could not be completed. Please try again.");
                }
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Player-Registry");
        thread.setDaemon(true);
        thread.start();
    }

    @JavascriptInterface public void cancelPlayerIdentity(String requestId) {
        if (requestId != null) cancelledRequests.add(requestId);
    }

    @JavascriptInterface public void refreshPlayerRegistry(String requestId) {
        if (requestId == null) return;
        Thread thread = new Thread(() -> {
            try {
                String readme = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/main/README.md");
                String marker = "Latest pinned source:";
                int markerIndex = readme.indexOf(marker);
                if (markerIndex < 0) throw new Exception("The Universe source pin could not be verified.");
                String remainder = readme.substring(markerIndex + marker.length());
                int opening = remainder.indexOf((char)96);
                int closing = opening < 0 ? -1 : remainder.indexOf((char)96, opening + 1);
                if (opening < 0 || closing <= opening + 1) throw new Exception("The Universe source pin could not be verified.");
                String shortSha = remainder.substring(opening + 1, closing).trim();
                if (!shortSha.matches("[a-fA-F0-9]{7,40}")) throw new Exception("The Universe source pin is malformed.");

                String commitJson = fetch("https://api.github.com/repos/" + UNIVERSE + "/commits/" + shortSha);
                String fullSha = new JSONObject(commitJson).getString("sha");
                if (!fullSha.matches("[a-fA-F0-9]{40}")) throw new Exception("The pinned Universe commit could not be verified.");

                String registry = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/" + fullSha + "/players.md");
                if (cancelledRequests.contains(requestId)) return;

                JSONArray registeredNames = new JSONArray();
                Pattern rowPattern = Pattern.compile("^\\|\\s*([^|]+?)\\s*\\|\\s*\\[[^\\]]+\\]\\(players/[^)]+\\)", Pattern.MULTILINE);
                Matcher rows = rowPattern.matcher(registry);
                while (rows.find()) {
                    String name = rows.group(1).trim();
                    if (!name.isEmpty()) registeredNames.put(name);
                }
                if (registeredNames.length() == 0) throw new Exception("No valid player entries were found in the pinned players.md registry.");
                if (cancelledRequests.contains(requestId)) return;
                rememberPlayerRegistry(registeredNames, fullSha);
                completeRegistry(requestId, true, registeredNames.toString(), "universe:" + fullSha, "");
            } catch (Exception error) {
                if (!cancelledRequests.contains(requestId)) {
                    completeRegistry(requestId, false, "[]", "", "Could not refresh the pinned Universe player registry. Check the connection and try again.");
                }
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Player-Registry-Refresh");
        thread.setDaemon(true);
        thread.start();
    }

    private String fetch(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(12000);
        connection.setRequestProperty("User-Agent", "Merzkava-Pocket-Android");
        connection.setRequestProperty("Accept", "text/plain, application/vnd.github+json");
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return output.toString(StandardCharsets.UTF_8.name());
        } finally {
            connection.disconnect();
        }
    }

    private void completeDeveloper(String requestId, boolean ok, String displayName, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.access("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(displayName) + "," + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    private void completeRegistry(String requestId, boolean ok, String namesJson, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.registry("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(namesJson) + ","
            + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    private void completePlayer(String requestId, boolean ok, String displayName, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.player("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(displayName) + "," + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    @JavascriptInterface public void exitApp() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 21) activity.finishAndRemoveTask();
            else activity.finish();
        });
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
