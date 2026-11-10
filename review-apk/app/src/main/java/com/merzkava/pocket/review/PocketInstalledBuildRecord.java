package com.merzkava.pocket.review;

import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public final class PocketInstalledBuildRecord {
    public static final String FILE_NAME="Merzkava-Pocket-Installed-Build.txt";
    public static final String RELATIVE_PATH=Environment.DIRECTORY_DOWNLOADS+"/Merzkava Pocket/";
    private static final long VERSION_CODE_OFFSET=10000L;

    private PocketInstalledBuildRecord(){}

    public static void update(Context context,String source){
        try{
            PackageInfo info=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
            long versionCode=Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;
            int buildNumber=(int)Math.max(0L,versionCode-VERSION_CODE_OFFSET);
            String version=info.versionName==null?"Unknown":info.versionName;
            long now=System.currentTimeMillis();
            String text="MERZKAVA POCKET\n"
                +"INSTALLED BUILD RECORD\n"
                +"=======================\n"
                +"Package: "+context.getPackageName()+"\n"
                +"Latest installed build: #"+buildNumber+"\n"
                +"Release tag: pocket-build-"+buildNumber+"\n"
                +"Version: "+version+"\n"
                +"Android version code: "+versionCode+"\n"
                +"First installed (UTC): "+format(info.firstInstallTime)+"\n"
                +"Last updated/installed (UTC): "+format(info.lastUpdateTime)+"\n"
                +"Last verified (UTC): "+format(now)+"\n"
                +"Record event: "+clean(source)+"\n"
                +"Device: "+Build.MANUFACTURER+" "+Build.MODEL+"\n"
                +"Android: "+Build.VERSION.RELEASE+" (API "+Build.VERSION.SDK_INT+")\n"
                +"\n"
                +"This TXT is kept in shared Downloads so the latest installed Pocket build can be checked after uninstalling the app.\n";
            if(writeSharedDownloads(context,text)){
                Log.i("PocketBuildRecord","Updated shared build record for Pocket build #"+buildNumber);
            }else{
                Log.w("PocketBuildRecord","Could not write the shared installed-build TXT.");
            }
        }catch(Exception error){
            Log.w("PocketBuildRecord","Could not create the installed-build TXT.",error);
        }
    }

    private static boolean writeSharedDownloads(Context context,String text)throws Exception{
        if(Build.VERSION.SDK_INT>=29){
            ContentResolver resolver=context.getContentResolver();
            Uri collection=MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            String selection=MediaStore.MediaColumns.DISPLAY_NAME+"=? AND "+MediaStore.MediaColumns.RELATIVE_PATH+"=?";
            Uri target=null;
            try(Cursor cursor=resolver.query(collection,new String[]{MediaStore.MediaColumns._ID},
                    selection,new String[]{FILE_NAME,RELATIVE_PATH},null)){
                if(cursor!=null){
                    while(cursor.moveToNext()){
                        Uri row=ContentUris.withAppendedId(collection,cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)));
                        if(target==null)target=row;else resolver.delete(row,null,null);
                    }
                }
            }
            boolean created=false;
            if(target==null){
                ContentValues values=new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME,FILE_NAME);
                values.put(MediaStore.MediaColumns.MIME_TYPE,"text/plain");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,RELATIVE_PATH);
                values.put(MediaStore.MediaColumns.IS_PENDING,1);
                target=resolver.insert(collection,values);
                if(target==null)return false;
                created=true;
            }
            boolean written=false;
            try(OutputStream output=resolver.openOutputStream(target,"wt")){
                if(output==null)throw new IllegalStateException("Downloads TXT output stream was unavailable.");
                output.write(text.getBytes(StandardCharsets.UTF_8));
                output.flush();
                written=true;
            }finally{
                if(created){
                    ContentValues publish=new ContentValues();
                    publish.put(MediaStore.MediaColumns.IS_PENDING,0);
                    resolver.update(target,publish,null,null);
                    if(!written)resolver.delete(target,null,null);
                }
            }
            return written;
        }
        // Android 6–9 fallback: app-private external storage does not survive uninstall.
        File root=context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if(root==null)return false;
        File folder=new File(root,"Merzkava Pocket");
        if(!folder.isDirectory()&&!folder.mkdirs())return false;
        try(FileOutputStream output=new FileOutputStream(new File(folder,FILE_NAME),false)){
            output.write(text.getBytes(StandardCharsets.UTF_8));
            output.flush();
        }
        return true;
    }

    private static String format(long value){
        if(value<=0)return "Unknown";
        SimpleDateFormat formatter=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",Locale.ROOT);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(new Date(value));
    }

    private static String clean(String value){
        if(value==null||value.trim().isEmpty())return "app-resume";
        return value.replaceAll("[\\r\\n\\t]+"," ").trim();
    }
}
