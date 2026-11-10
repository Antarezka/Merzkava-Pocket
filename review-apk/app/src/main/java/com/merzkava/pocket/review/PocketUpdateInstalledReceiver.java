package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Environment;
import java.io.File;

public final class PocketUpdateInstalledReceiver extends BroadcastReceiver {
    private static final String PREFS="merzkava-pocket-access";
    private static final String PREF_DOWNLOAD_ID="pocket_update_download_id_v1";
    private static final String PREF_FILE_NAME="pocket_update_file_name_v1";
    private static final String PREF_BUILD_NUMBER="pocket_update_build_number_v1";
    private static final String PREF_SHA256="pocket_update_sha256_v1";

    @Override public void onReceive(Context context, Intent intent) {
        if(intent==null||!Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction()))return;
        SharedPreferences preferences=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        long downloadId=preferences.getLong(PREF_DOWNLOAD_ID,-1L);
        String fileName=preferences.getString(PREF_FILE_NAME,"");
        if(downloadId>=0L){
            try{
                DownloadManager manager=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
                if(manager!=null)manager.remove(downloadId);
            }catch(Exception error){android.util.Log.w("PocketUpdate","Could not remove installed updater download row",error);}
        }
        if(fileName!=null&&fileName.matches("[A-Za-z0-9._-]+\\.apk")){
            File directory=context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if(directory!=null){
                File downloadedApk=new File(directory,fileName);
                if(downloadedApk.isFile()&&!downloadedApk.delete())
                    android.util.Log.w("PocketUpdate","Could not delete installed Pocket APK download");
            }
        }
        preferences.edit().remove(PREF_DOWNLOAD_ID).remove(PREF_FILE_NAME)
            .remove(PREF_BUILD_NUMBER).remove(PREF_SHA256).apply();
    }
}
