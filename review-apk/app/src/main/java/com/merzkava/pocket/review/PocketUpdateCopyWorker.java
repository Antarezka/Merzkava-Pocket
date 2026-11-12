package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PocketUpdateCopyWorker {
    private static final String PREFS = "merzkava-pocket-access";
    private static final String PREF_DOWNLOAD_ID = "pocket_update_download_id_v1";
    private static final String PREF_SHA256 = "pocket_update_sha256_v1";
    private static final String PREF_FILE_NAME = "pocket_update_file_name_v1";
    private static final String PREF_BUILD_NUMBER = "pocket_update_build_number_v1";

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "Pocket-Update-File-Copy");
        thread.setDaemon(true);
        return thread;
    });
    private static final Set<Long> ACTIVE = ConcurrentHashMap.newKeySet();

    private PocketUpdateCopyWorker() {}

    public static boolean isRunning(long downloadId) {
        return downloadId >= 0L && ACTIVE.contains(downloadId);
    }

    public static void schedule(Context context, long downloadId, int buildNumber) {
        if (context == null || downloadId < 0L || buildNumber <= 0 || !ACTIVE.add(downloadId)) return;
        Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> copyCompletedDownload(app, downloadId, buildNumber));
    }

    private static void copyCompletedDownload(Context context, long downloadId, int buildNumber) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            DownloadManager downloads = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloads == null) throw new IOException("Android Download Manager is unavailable.");
            try (Cursor cursor = downloads.query(new DownloadManager.Query().setFilterById(downloadId))) {
                if (cursor == null || !cursor.moveToFirst()) {
                    preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "missing")
                        .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE,
                            "Android could not find the temporary APK. Download it again.").apply();
                    return;
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (status != DownloadManager.STATUS_SUCCESSFUL) return;
            }

            Uri staging = downloads.getUriForDownloadedFile(downloadId);
            if (staging == null) {
                preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "missing")
                    .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE,
                        "The temporary APK disappeared before it could be saved. Download it again.").apply();
                return;
            }
            Uri folder = PocketUpdateStorage.savedDirectoryUri(context);
            if (!PocketUpdateStorage.directoryAvailable(context, folder)) {
                preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "folder_unavailable")
                    .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE,
                        "Choose or reselect the Pocket update folder in Settings.").apply();
                return;
            }

            String fileName = preferences.getString(PREF_FILE_NAME, "");
            String sha256 = preferences.getString(PREF_SHA256, "");
            if (PocketUpdateStorage.buildNumberFromName(fileName) != buildNumber) {
                throw new IOException("The downloaded APK name does not match the selected Pocket build.");
            }
            Uri saved = PocketUpdateStorage.copyAndVerify(context, staging, folder, fileName, sha256);
            if (!preferences.edit()
                    .putString(PocketUpdateStorage.PREF_SAVED_URI, saved.toString())
                    .putString(PocketUpdateStorage.PREF_STATUS, "completed")
                    .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE)
                    .commit()) {
                PocketUpdateStorage.delete(context, saved);
                throw new IOException("Pocket could not save the verified APK record.");
            }

            PocketUpdateStorage.removePocketApks(context, folder, buildNumber);
            try { downloads.remove(downloadId); } catch (Exception ignored) {}
            preferences.edit().remove(PREF_DOWNLOAD_ID).apply();
        } catch (Exception error) {
            String message = error.getMessage() == null
                ? "Pocket could not save the APK to the selected folder." : error.getMessage();
            String status = message.contains("failed its SHA-256 integrity check") ? "failed" : "save_failed";
            preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, status)
                .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE, message).apply();
        } finally {
            ACTIVE.remove(downloadId);
        }
    }
}
