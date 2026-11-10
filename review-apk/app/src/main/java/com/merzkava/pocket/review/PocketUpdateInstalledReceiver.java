package com.merzkava.pocket.review;

import android.app.DownloadManager;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PocketUpdateInstalledReceiver extends BroadcastReceiver {
    private static final String TAG="PocketUpdateCleanup";
    private static final String PREFS="merzkava-pocket-access";
    private static final String PREF_DOWNLOAD_ID="pocket_update_download_id_v1";
    private static final String PREF_FILE_NAME="pocket_update_file_name_v1";
    private static final String PREF_BUILD_NUMBER="pocket_update_build_number_v1";
    private static final String PREF_SHA256="pocket_update_sha256_v1";
    private static final int UPDATE_NOTIFICATION_ID=8202;
    private static final long VERSION_CODE_OFFSET=10000L;
    private static final Pattern POCKET_APK=Pattern.compile(
        "^Merzkava-Pocket-Build-([0-9]+)-[A-Za-z0-9._-]+\\.apk$",Pattern.CASE_INSENSITIVE);

    @Override public void onReceive(Context context,Intent intent){
        if(intent==null||!Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction()))return;
        final PendingResult pending=goAsync();
        Thread worker=new Thread(()->{
            try{
                int installedBuild=getInstalledBuildNumber(context);
                if(installedBuild<=0)throw new IllegalStateException("Installed Pocket build could not be verified.");
                removePocketApksAtOrBelow(context,installedBuild);
                PocketInstalledBuildRecord.update(context,"Android confirmed package replacement");
                NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
                if(manager!=null)manager.cancel(UPDATE_NOTIFICATION_ID);
            }catch(Exception error){
                Log.w(TAG,"Post-install Pocket cleanup could not be completed.",error);
            }finally{pending.finish();}
        },"Pocket-Post-Install-Cleanup");
        worker.setDaemon(true);
        worker.start();
    }

    private static int getInstalledBuildNumber(Context context)throws Exception{
        android.content.pm.PackageInfo info=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
        long version=Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;
        return (int)Math.max(0L,version-VERSION_CODE_OFFSET);
    }

    private static void removePocketApksAtOrBelow(Context context,int installedBuild){
        SharedPreferences prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        long savedId=prefs.getLong(PREF_DOWNLOAD_ID,-1L);
        int savedBuild=prefs.getInt(PREF_BUILD_NUMBER,-1);
        String savedName=prefs.getString(PREF_FILE_NAME,"");

        DownloadManager downloads=(DownloadManager)context.getSystemService(Context.DOWNLOAD_SERVICE);
        List<Long> idsToRemove=new ArrayList<>();
        if(downloads!=null){
            try(Cursor cursor=downloads.query(new DownloadManager.Query())){
                if(cursor!=null){
                    int idCol=cursor.getColumnIndex(DownloadManager.COLUMN_ID);
                    int uriCol=cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                    int descCol=cursor.getColumnIndex(DownloadManager.COLUMN_DESCRIPTION);
                    while(cursor.moveToNext()){
                        String name=uriCol>=0?fileNameFromUri(cursor.getString(uriCol)):"";
                        if(name.isEmpty()&&descCol>=0){
                            String description=cursor.getString(descCol);
                            if(description!=null&&description.startsWith("Downloading "))name=description.substring("Downloading ".length());
                        }
                        int build=buildNumberFromName(name);
                        if(build>0&&build<=installedBuild&&idCol>=0)idsToRemove.add(cursor.getLong(idCol));
                    }
                }
            }catch(Exception error){Log.w(TAG,"Could not enumerate Pocket DownloadManager entries.",error);}
        }
        if(downloads!=null&&!idsToRemove.isEmpty()){
            long[] ids=new long[idsToRemove.size()];
            for(int i=0;i<idsToRemove.size();i++)ids[i]=idsToRemove.get(i);
            try{downloads.remove(ids);}
            catch(Exception error){Log.w(TAG,"Could not remove old Pocket DownloadManager entries.",error);}
        }

        File privateDownloads=context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if(privateDownloads!=null&&privateDownloads.isDirectory()){
            File[] entries=privateDownloads.listFiles();
            if(entries!=null)for(File file:entries){
                if(!file.isFile())continue;
                int build=buildNumberFromName(file.getName());
                if(build>0&&build<=installedBuild&&!file.delete())Log.w(TAG,"Could not delete Pocket APK: "+file.getName());
            }
        }

        if(Build.VERSION.SDK_INT>=29){
            ContentResolver resolver=context.getContentResolver();
            Uri collection=MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            try(Cursor cursor=resolver.query(collection,
                    new String[]{MediaStore.MediaColumns._ID,MediaStore.MediaColumns.DISPLAY_NAME,
                        MediaStore.MediaColumns.RELATIVE_PATH},null,null,null)){
                if(cursor!=null){
                    int idCol=cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
                    int nameCol=cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                    int pathCol=cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH);
                    while(cursor.moveToNext()){
                        String name=cursor.getString(nameCol),relative=cursor.getString(pathCol);
                        int build=buildNumberFromName(name);
                        if(build<=0||build>installedBuild||relative==null||
                            !relative.startsWith(Environment.DIRECTORY_DOWNLOADS+"/"))continue;
                        Uri row=ContentUris.withAppendedId(collection,cursor.getLong(idCol));
                        try{resolver.delete(row,null,null);}
                        catch(Exception error){Log.w(TAG,"Could not remove shared Pocket APK "+name,error);}
                    }
                }
            }catch(Exception error){Log.w(TAG,"Could not enumerate shared Pocket APKs.",error);}
        }

        if(savedId>=0L&&savedBuild>0&&savedBuild<=installedBuild&&downloads!=null){
            try{downloads.remove(savedId);}catch(Exception ignored){}
        }
        if(savedName!=null&&buildNumberFromName(savedName)>0&&buildNumberFromName(savedName)<=installedBuild&&privateDownloads!=null){
            File saved=new File(privateDownloads,savedName);
            if(saved.isFile())saved.delete();
        }
        if(savedBuild<=installedBuild||savedBuild<0){
            prefs.edit().remove(PREF_DOWNLOAD_ID).remove(PREF_FILE_NAME)
                .remove(PREF_BUILD_NUMBER).remove(PREF_SHA256).apply();
        }
        Log.i(TAG,"Removed Pocket APK builds at or below installed build #"+installedBuild);
    }

    private static String fileNameFromUri(String value){
        if(value==null||value.isEmpty())return "";
        try{String name=Uri.parse(value).getLastPathSegment();return name==null?"":name;}
        catch(Exception ignored){return "";}
    }

    private static int buildNumberFromName(String name){
        if(name==null)return -1;
        Matcher match=POCKET_APK.matcher(name);
        if(!match.matches())return -1;
        try{return Integer.parseInt(match.group(1));}
        catch(Exception ignored){return -1;}
    }
}
