package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import java.util.Locale;

public final class PocketUpdateProgressService extends Service {
    private static final String TAG = "PocketUpdate";
    private static final String PREFS = "merzkava-pocket-access";
    private static final String PREF_DOWNLOAD_ID = "pocket_update_download_id_v1";
    private static final String PREF_SHA256 = "pocket_update_sha256_v1";
    private static final String PREF_FILE_NAME = "pocket_update_file_name_v1";
    private static final String PREF_BUILD_NUMBER = "pocket_update_build_number_v1";
    private static final String PREF_UPDATE_URL = "pocket_update_download_url_v1";
    private static final String PREF_THEME = "pocket_update_notification_theme_v1";
    private static final String CHANNEL_ID = "merzkava-pocket-update-progress";
    private static final int NOTIFICATION_ID = 8202;
    private static final long POLL_INTERVAL_MS = 750L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable poll = this::pollDownload;
    private volatile boolean copying;

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        Notification initial = buildNotification("Preparing Pocket update…", 0, true, 0L, 0L,
            "DOWNLOAD IN PROGRESS", null, null);
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, initial,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, initial);
        }
        handler.removeCallbacks(poll);
        handler.post(poll);
        // Keep the progress monitor alive if Android reclaims the process mid-download.
        return START_STICKY;
    }

    private void pollDownload() {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long downloadId = prefs.getLong(PREF_DOWNLOAD_ID, -1L);
        int build = prefs.getInt(PREF_BUILD_NUMBER, 0);
        if (downloadId < 0L || build <= 0) {
            finishNotification("No active Pocket update download was found.", 0, false, false);
            return;
        }

        DownloadManager downloads = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloads == null) {
            finishNotification("Android Download Manager is unavailable.", 0, false, true);
            return;
        }

        try (Cursor cursor = downloads.query(new DownloadManager.Query().setFilterById(downloadId))) {
            if (cursor == null || !cursor.moveToFirst()) {
                finishNotification("Pocket could not find this update download.", 0, false, true);
                return;
            }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            int percent = total > 0L ? (int) Math.max(0L, Math.min(100L,
                Math.round(downloaded * 100.0 / total))) : 0;

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                Uri saved = PocketUpdateStorage.savedApkUri(this);
                if (saved != null && PocketUpdateStorage.exists(this, saved)) {
                    finishNotification("DOWNLOAD COMPLETE · SAVED IN YOUR FOLDER", 100, true, false);
                    return;
                }
                Uri staging = downloads.getUriForDownloadedFile(downloadId);
                if (staging == null) {
                    finishNotification("The temporary Pocket APK is no longer available. Download again.", 0, false, true);
                    return;
                }
                Uri folder = PocketUpdateStorage.savedDirectoryUri(this);
                if (!PocketUpdateStorage.directoryAvailable(this, folder)) {
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                        .putString(PocketUpdateStorage.PREF_STATUS, "folder_unavailable").apply();
                    finishNotification("Choose or reselect the Pocket update folder in Settings.", 100, false, true);
                    return;
                }
                copyVerifiedApk(downloads, downloadId, staging, build, percent, downloaded, total);
                return;
            }
            if (status == DownloadManager.STATUS_FAILED) {
                int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                finishNotification("DOWNLOAD FAILED · CODE " + reason, percent, false, true);
                return;
            }

            String title = status == DownloadManager.STATUS_PAUSED ? "Pocket update is paused" : "Downloading Pocket update";
            String summary = percent + "%  ·  " + formatBytes(downloaded) +
                (total > 0L ? " / " + formatBytes(total) : " downloaded");
            if (status == DownloadManager.STATUS_PENDING) summary = "Queued · waiting for Android Download Manager";
            finishNotification(title, percent, false, false, summary, true);
            handler.postDelayed(poll, POLL_INTERVAL_MS);
        } catch (Exception error) {
            Log.w(TAG, "Could not refresh updater notification progress.", error);
            handler.postDelayed(poll, 1500L);
        }
    }

    private void copyVerifiedApk(DownloadManager downloads, long downloadId, Uri staging,
            int build, int percent, long downloaded, long total) {
        if (copying) return;
        copying = true;
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prefs.edit().putString(PocketUpdateStorage.PREF_STATUS, "copying").apply();
        finishNotification("Saving Pocket update", 100, false, false,
            "VERIFYING · SAVING TO YOUR MERZKAVA POCKET FOLDER", true);
        Thread worker = new Thread(() -> {
            try {
                String fileName = prefs.getString(PREF_FILE_NAME, "");
                String sha256 = prefs.getString(PREF_SHA256, "");
                Uri folder = PocketUpdateStorage.savedDirectoryUri(this);
                if (!PocketUpdateStorage.directoryAvailable(this, folder)) {
                    throw new IOException("The selected folder permission is no longer available. Choose it again in Settings.");
                }
                Uri saved = PocketUpdateStorage.copyAndVerify(
                    this, staging, folder, fileName, sha256);
                if (!prefs.edit().putString(PocketUpdateStorage.PREF_SAVED_URI, saved.toString())
                    .putString(PocketUpdateStorage.PREF_STATUS, "completed").commit()) {
                    PocketUpdateStorage.delete(this, saved);
                    throw new IOException("Pocket could not save the verified APK record.");
                }
                PocketUpdateStorage.removePocketApks(this, folder, build);
                try { downloads.remove(downloadId); } catch (Exception ignored) {}
                prefs.edit().remove(PREF_DOWNLOAD_ID).apply();
                finishNotification("DOWNLOAD COMPLETE · SAVED IN YOUR FOLDER", 100, true, false);
            } catch (Exception error) {
                Log.w(TAG, "Could not save the verified APK to the selected Pocket folder.", error);
                prefs.edit().putString(PocketUpdateStorage.PREF_STATUS, "save_failed").apply();
                finishNotification("Pocket could not save the update", percent, false, true,
                    error.getMessage() == null ? "Choose an available folder and try again." : error.getMessage(), false);
            } finally {
                copying = false;
            }
        }, "Pocket-Update-Save-Verified-APK");
        worker.setDaemon(true);
        worker.start();
    }

    private void finishNotification(String summary, int percent, boolean completed, boolean failed) {
        finishNotification(completed ? "Pocket update is ready" : "Pocket update",
            percent, completed, failed, summary, false);
    }

    private void finishNotification(String title, int percent, boolean completed, boolean failed,
            String summary, boolean ongoing) {
        Notification notification = buildNotification(title, percent, ongoing, 0L, 0L,
            summary, completed ? "VERIFY & INSTALL" : (failed ? "TRY AGAIN" : null),
            completed ? MainActivity.ACTION_INSTALL_UPDATE : (failed ? MainActivity.ACTION_DOWNLOAD_UPDATE : null));
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification);
        if (!ongoing) {
            stopForeground(false);
            stopSelf();
        }
    }

    private Notification buildNotification(String title, int percent, boolean ongoing,
            long downloaded, long total, String summary, String actionLabel, String actionName) {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int build = prefs.getInt(PREF_BUILD_NUMBER, 0);
        String version = prefs.getString(PREF_FILE_NAME, "Pocket update");
        boolean light = "light".equalsIgnoreCase(prefs.getString(PREF_THEME, "dark"));
        int background = light ? R.drawable.pocket_update_notification_light : R.drawable.pocket_update_notification_dark;
        int foreground = light ? Color.rgb(45, 57, 45) : Color.rgb(242, 237, 220);
        int muted = light ? Color.rgb(101, 108, 94) : Color.rgb(190, 198, 183);
        int accent = Color.rgb(239, 254, 89);

        RemoteViews compact = new RemoteViews(getPackageName(), R.layout.pocket_update_notification_compact);
        RemoteViews expanded = new RemoteViews(getPackageName(), R.layout.pocket_update_notification_expanded);
        setNotificationView(compact, background, foreground, muted, accent, build, version,
            title, summary, percent, ongoing, actionLabel, actionName);
        setNotificationView(expanded, background, foreground, muted, accent, build, version,
            title, summary, percent, ongoing, actionLabel, actionName);
        expanded.setTextViewText(R.id.pocket_update_notification_notes,
            "Pocket saves the verified APK inside the Merzkava Pocket subfolder you selected. Installation checks the SHA-256 hash before Android opens the installer.");

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = null;
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open = PendingIntent.getActivity(this, NOTIFICATION_ID, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        }

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        builder.setSmallIcon(R.drawable.ic_notification_tv)
            .setContentTitle("Merzkava Pocket · Build #" + build)
            .setContentText(summary)
            .setColor(accent)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setPriority(Notification.PRIORITY_LOW)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(true)
            .setOngoing(ongoing)
            .setAutoCancel(!ongoing)
            .setProgress(100, Math.max(0, Math.min(100, percent)), false)
            .setShowWhen(true);
        if (open != null) builder.setContentIntent(open);
        if (Build.VERSION.SDK_INT >= 24) {
            builder.setCustomContentView(compact)
                .setCustomHeadsUpContentView(compact)
                .setCustomBigContentView(expanded);
        } else {
            builder.setContent(compact);
        }
        return builder.build();
    }

    private void setNotificationView(RemoteViews views, int background, int foreground, int muted,
            int accent, int build, String fileName, String title, String summary, int percent,
            boolean ongoing, String actionLabel, String actionName) {
        views.setInt(R.id.pocket_update_notification_root, "setBackgroundResource", background);
        views.setTextViewText(R.id.pocket_update_notification_brand, "MERZKAVA  /  POCKET");
        views.setTextViewText(R.id.pocket_update_notification_eyebrow, "POCKET UPDATE");
        views.setTextViewText(R.id.pocket_update_notification_title, title);
        views.setTextViewText(R.id.pocket_update_notification_build,
            "BUILD #" + build + "  ·  " + fileName);
        views.setTextViewText(R.id.pocket_update_notification_summary, summary);
        views.setTextColor(R.id.pocket_update_notification_brand, accent);
        views.setTextColor(R.id.pocket_update_notification_eyebrow, muted);
        views.setTextColor(R.id.pocket_update_notification_title, foreground);
        views.setTextColor(R.id.pocket_update_notification_build, accent);
        views.setTextColor(R.id.pocket_update_notification_summary, muted);
        views.setViewVisibility(R.id.pocket_update_notification_progress,
            ongoing || "DOWNLOAD COMPLETE · READY TO VERIFY".equals(summary) ? View.VISIBLE : View.GONE);
        views.setProgressBar(R.id.pocket_update_notification_progress, 100,
            Math.max(0, Math.min(100, percent)), false);
        if (actionLabel == null || actionName == null) {
            views.setViewVisibility(R.id.pocket_update_notification_action, View.GONE);
        } else {
            views.setTextViewText(R.id.pocket_update_notification_action, actionLabel);
            views.setViewVisibility(R.id.pocket_update_notification_action, View.VISIBLE);
            Intent action = new Intent(this, MainActivity.class);
            action.setAction(actionName);
            action.setData(Uri.parse("merzkava-pocket://update-action/" + actionName + "/" + build));
            action.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (MainActivity.ACTION_DOWNLOAD_UPDATE.equals(actionName)) {
                action.putExtra(MainActivity.EXTRA_UPDATE_URL, getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_UPDATE_URL, ""));
                action.putExtra(MainActivity.EXTRA_UPDATE_FILE_NAME, getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_FILE_NAME, ""));
                action.putExtra(MainActivity.EXTRA_UPDATE_SHA256, getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_SHA256, ""));
                action.putExtra(MainActivity.EXTRA_UPDATE_BUILD, build);
            }
            int requestCode = MainActivity.ACTION_INSTALL_UPDATE.equals(actionName) ? NOTIFICATION_ID + 2 : NOTIFICATION_ID + 3;
            PendingIntent pending = PendingIntent.getActivity(this, requestCode, action,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            views.setOnClickPendingIntent(R.id.pocket_update_notification_action, pending);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Pocket Update Progress",
            NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Live progress and install readiness for Pocket updates.");
        channel.enableLights(true);
        channel.setLightColor(Color.rgb(239, 254, 89));
        channel.enableVibration(false);
        channel.setSound(null, null);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024L) return bytes + " B";
        double value = bytes / 1024.0;
        if (value < 1024.0) return String.format(Locale.ROOT, "%.1f KB", value);
        return String.format(Locale.ROOT, "%.1f MB", value / 1024.0);
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onDestroy() {
        handler.removeCallbacks(poll);
        super.onDestroy();
    }
}
