package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

public final class PocketUpdateDownloadReceiver extends BroadcastReceiver {
    private static final String TAG = "PocketUpdateDownload";

    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
        if (completedId < 0L) return;

        SharedPreferences prefs = PocketUpdateStorage.preferences(context);
        long expectedId = prefs.getLong("pocket_update_download_id_v1", -1L);
        int buildNumber = prefs.getInt("pocket_update_build_number_v1", 0);
        if (completedId != expectedId || buildNumber <= 0) return;

        Log.i(TAG, "Pocket Build #" + buildNumber + " staging download completed; scheduling the verified folder copy.");
        PocketUpdateCopyWorker.schedule(context, completedId, buildNumber);
    }
}
