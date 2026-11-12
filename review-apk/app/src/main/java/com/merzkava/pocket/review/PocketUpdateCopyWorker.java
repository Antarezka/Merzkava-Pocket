package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;

import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class PocketUpdateCopyWorker extends Worker {
    private static final String PREFS = "merzkava-pocket-access";
    private static final String PREF_DOWNLOAD_ID = "pocket_update_download_id_v1";
    private static final String PREF_SHA256 = "pocket_update_sha256_v1";
    private static final String PREF_FILE_NAME = "pocket_update_file_name_v1";
    private static final String PREF_BUILD_NUMBER = "pocket_update_build_number_v1";
    private static final String INPUT_DOWNLOAD_ID = "download_id";
    private static final String INPUT_BUILD_NUMBER = "build_number";
    private static final Set<Long> ACTIVE = ConcurrentHashMap.newKeySet();

    public PocketUpdateCopyWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    public static boolean isRunning(long downloadId) {
        return downloadId >= 0L && ACTIVE.contains(downloadId);
    }

    public static void schedule(Context context, long downloadId, int buildNumber) {
        if (context == null || downloadId < 0L || buildNumber <= 0) return;
        if (!isDownloadComplete(context.getApplicationContext(), downloadId)) return;
        Data input = new Data.Builder()
            .putLong(INPUT_DOWNLOAD_ID, downloadId)
            .putInt(INPUT_BUILD_NUMBER, buildNumber)
            .build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PocketUpdateCopyWorker.class)
            .setInputData(input)
            .build();
        WorkManager.getInstance(context.getApplicationContext()).enqueueUniqueWork(
            "merzkava-pocket-update-copy-" + downloadId,
            ExistingWorkPolicy.KEEP,
            request);
    }

    private static boolean isDownloadComplete(Context context, long downloadId) {
        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return false;
        try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterById(downloadId))) {
            return cursor != null && cursor.moveToFirst() &&
                cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) ==
                    DownloadManager.STATUS_SUCCESSFUL;
        } catch (Exception ignored) { return false; }
    }

    @NonNull @Override public Result doWork() {
        long downloadId = getInputData().getLong(INPUT_DOWNLOAD_ID, -1L);
        int buildNumber = getInputData().getInt(INPUT_BUILD_NUMBER, 0);
        if (downloadId < 0L || buildNumber <= 0 || !ACTIVE.add(downloadId)) return Result.failure();
        try {
            copyCompletedDownload(getApplicationContext(), downloadId, buildNumber);
            return Result.success();
        } catch (Exception error) {
            String message = error.getMessage() == null
                ? "Pocket could not save the APK to the selected folder." : error.getMessage();
            String status = message.contains("Choose or reselect the Pocket update folder")
                ? "folder_unavailable"
                : (message.contains("failed its SHA-256 integrity check") ||
                   message.contains("disappeared before it could be saved")) ? "failed" : "save_failed";
            getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(PocketUpdateStorage.PREF_STATUS, status)
                .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE, message)
                .apply();
            return Result.failure(new Data.Builder().putString("message", message).build());
        } finally {
            ACTIVE.remove(downloadId);
        }
    }

    private static void copyCompletedDownload(Context context, long downloadId, int buildNumber)
            throws IOException {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        DownloadManager downloads = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloads == null) throw new IOException("Android Download Manager is unavailable.");
        try (Cursor cursor = downloads.query(new DownloadManager.Query().setFilterById(downloadId))) {
            if (cursor == null || !cursor.moveToFirst()) {
                throw new IOException("Android could not find the temporary APK.");
            }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status != DownloadManager.STATUS_SUCCESSFUL) {
                throw new IOException("The Pocket APK is not fully downloaded yet.");
            }
        }

        Uri staging = downloads.getUriForDownloadedFile(downloadId);
        if (staging == null) throw new IOException("The temporary APK disappeared before it could be saved.");
        Uri folder = PocketUpdateStorage.savedDirectoryUri(context);
        if (!PocketUpdateStorage.directoryAvailable(context, folder)) {
            preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "folder_unavailable")
                .putString(PocketUpdateStorage.PREF_STATUS_MESSAGE,
                    "Choose or reselect the Pocket update folder in Settings.").apply();
            throw new IOException("Choose or reselect the Pocket update folder in Settings.");
        }

        preferences.edit().putString(PocketUpdateStorage.PREF_STATUS, "copying")
            .remove(PocketUpdateStorage.PREF_STATUS_MESSAGE).apply();
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
    }
}
