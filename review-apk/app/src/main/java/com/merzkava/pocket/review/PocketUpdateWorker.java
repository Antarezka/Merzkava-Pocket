package com.merzkava.pocket.review;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PocketUpdateWorker extends Worker {
    private static final String TAG = "PocketUpdateWorker";
    private static final String REPOSITORY = "Antarezka/Merzkava-Pocket";
    private static final String PREFS = "merzkava-pocket-access";
    private static final String PREF_NOTIFIED_BUILD = "pocket_update_notified_build_v1";
    private static final String UNIQUE_WORK = "merzkava-pocket-periodic-update-check";
    private static final String CHANNEL_ID = "merzkava-pocket-updates";
    private static final int NOTIFICATION_ID = 8202;
    private static final long VERSION_CODE_OFFSET = 10000L;

    public PocketUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    public static void schedule(@NonNull Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true)
            .build();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            PocketUpdateWorker.class, 24, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build();
        WorkManager.getInstance(context.getApplicationContext()).enqueueUniquePeriodicWork(
            UNIQUE_WORK, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            Context context = getApplicationContext();
            if (!notificationsAllowed(context)) return Result.success();

            JSONObject release = new JSONObject(fetch(
                "https://api.github.com/repos/" + REPOSITORY + "/releases/latest"));
            String tag = release.optString("tag_name", "");
            Matcher tagMatch = Pattern.compile("^pocket-build-([0-9]+)$").matcher(tag);
            if (!tagMatch.matches()) return Result.success();

            JSONArray assets = release.optJSONArray("assets");
            if (assets == null) return Result.success();
            JSONObject manifestAsset = null;
            JSONObject apkAsset = null;
            for (int i = 0; i < assets.length(); i++) {
                JSONObject asset = assets.optJSONObject(i);
                if (asset == null) continue;
                String name = asset.optString("name", "");
                if ("pocket-update.json".equals(name)) manifestAsset = asset;
                else if (name.toLowerCase(Locale.ROOT).endsWith(".apk")) apkAsset = asset;
            }
            if (manifestAsset == null || apkAsset == null) return Result.success();

            String manifestUrl = manifestAsset.optString("browser_download_url", "");
            Uri manifestUri = Uri.parse(manifestUrl);
            String expectedReleasePath = "/" + REPOSITORY + "/releases/download/" + tag + "/";
            if (!trustedGithubReleaseUrl(manifestUri, expectedReleasePath)) return Result.success();

            JSONObject manifest = new JSONObject(fetch(manifestUrl));
            int buildNumber = manifest.optInt("buildNumber", -1);
            int tagBuild = Integer.parseInt(tagMatch.group(1));
            if (buildNumber != tagBuild ||
                !"com.merzkava.pocket".equals(manifest.optString("packageName", ""))) {
                return Result.success();
            }

            String apkName = manifest.optString("apkName", "");
            String apkUrl = apkAsset.optString("browser_download_url", "");
            Uri apkUri = Uri.parse(apkUrl);
            String hash = manifest.optString("sha256", "").toLowerCase(Locale.ROOT);
            long assetSize = apkAsset.optLong("size", 0L);
            long manifestSize = manifest.optLong("apkSizeBytes", 0L);
            if (!apkName.equals(apkAsset.optString("name", "")) ||
                !apkName.matches("Merzkava-Pocket-Build-[0-9]+-[A-Za-z0-9._-]+\\.apk") ||
                !trustedGithubReleaseUrl(apkUri, expectedReleasePath) ||
                !hash.matches("[a-f0-9]{64}") || assetSize <= 0L ||
                (manifestSize > 0L && manifestSize != assetSize)) {
                return Result.success();
            }

            PackageInfo installed = context.getPackageManager().getPackageInfo(
                context.getPackageName(), 0);
            long installedCode = Build.VERSION.SDK_INT >= 28
                ? installed.getLongVersionCode() : installed.versionCode;
            long installedBuild = Math.max(0L, installedCode - VERSION_CODE_OFFSET);
            if (buildNumber <= installedBuild) return Result.success();

            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (prefs.getInt(PREF_NOTIFIED_BUILD, 0) == buildNumber) return Result.success();
            JSONArray releaseNotesJson = manifest.optJSONArray("notes");
            StringBuilder releaseNotes = new StringBuilder();
            if (releaseNotesJson != null) {
                for (int i = 0; i < Math.min(4, releaseNotesJson.length()); i++) {
                    String note = releaseNotesJson.optString(i, "").trim();
                    if (!note.isEmpty()) releaseNotes.append("• ").append(note).append("\n");
                }
            }
            if (releaseNotes.length() == 0) releaseNotes.append(release.optString("body", "").trim());

            if (!postUpdateNotification(context, buildNumber,
                manifest.optString("versionName", tag), apkUrl, apkName, hash, releaseNotes.toString())) {
                return Result.retry();
            }
            prefs.edit().putInt(PREF_NOTIFIED_BUILD, buildNumber).apply();
            return Result.success();
        } catch (Exception error) {
            Log.w(TAG, "Periodic Pocket update check failed; WorkManager will retry.", error);
            return Result.retry();
        }
    }

    private static boolean trustedGithubReleaseUrl(Uri uri, String expectedPrefix) {
        return uri != null && "https".equals(uri.getScheme()) &&
            "github.com".equalsIgnoreCase(uri.getHost()) &&
            uri.getPath() != null && uri.getPath().startsWith(expectedPrefix);
    }

    private static String fetch(String address) throws IOException {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(address).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(16000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "application/vnd.github+json");
            connection.setRequestProperty("User-Agent", "Merzkava-Pocket-Update-Worker");
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IOException("GitHub returned HTTP " + status);
            try (InputStream input = connection.getInputStream();
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > 1024 * 1024) throw new IOException("Update metadata is too large.");
                }
                return output.toString(StandardCharsets.UTF_8.name());
            }
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static boolean notificationsAllowed(Context context) {
        NotificationManager manager = (NotificationManager)
            context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        return Build.VERSION.SDK_INT < 33 ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }

    private static boolean postUpdateNotification(
        Context context, int buildNumber, String versionName,
        String apkUrl, String apkName, String sha256, String releaseNotes) {
        NotificationManager manager = (NotificationManager)
            context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Pocket Updates", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("New Merzkava Pocket builds and release notes.");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(channel);
        }

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return false;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent open = PendingIntent.getActivity(context, NOTIFICATION_ID, launch,
            PendingIntent.FLAG_UPDATE_CURRENT |
                (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));

        Intent downloadIntent = new Intent(context, MainActivity.class);
        downloadIntent.setAction(MainActivity.ACTION_DOWNLOAD_UPDATE);
        downloadIntent.setData(Uri.parse("merzkava-pocket://periodic-update-download/" + buildNumber));
        downloadIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_URL, apkUrl);
        downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_FILE_NAME, apkName);
        downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_SHA256, sha256);
        downloadIntent.putExtra(MainActivity.EXTRA_UPDATE_BUILD, buildNumber);
        PendingIntent download = PendingIntent.getActivity(context, NOTIFICATION_ID + 1,
            downloadIntent, PendingIntent.FLAG_UPDATE_CURRENT |
                (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));

        String detail = releaseNotes == null ? "" : releaseNotes.trim();
        if (detail.length() > 420) detail = detail.substring(0, 417) + "...";
        String title = "Merzkava Pocket · Build #" + buildNumber;
        String summary = "New Pocket update · " + versionName + " · Tap Download below.";
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_notification_tv)
            .setContentTitle(title)
            .setContentText(summary)
            .setStyle(new Notification.BigTextStyle().bigText(
                "A new Merzkava Pocket build is ready. Tap DOWNLOAD UPDATE in this device notification." +
                (detail.isEmpty() ? "" : "\n\n" + detail)))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_STATUS)
            .setPriority(Notification.PRIORITY_DEFAULT)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(R.drawable.ic_notification_tv, "DOWNLOAD UPDATE", download);
        manager.notify(NOTIFICATION_ID, builder.build());
        return true;
    }
}
