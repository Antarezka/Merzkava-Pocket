package com.merzkava.pocket.review;

import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PocketUpdateStorage {
    public static final String PREFS = "merzkava-pocket-access";
    public static final String PREF_TREE_URI = "pocket_update_tree_uri_v1";
    public static final String PREF_DIRECTORY_URI = "pocket_update_directory_uri_v1";
    public static final String PREF_DIRECTORY_LABEL = "pocket_update_directory_label_v1";
    public static final String PREF_SAVED_URI = "pocket_update_saved_uri_v1";
    public static final String PREF_STATUS = "pocket_update_file_status_v1";
    public static final String PREF_STATUS_MESSAGE = "pocket_update_file_status_message_v1";
    public static final String FOLDER_NAME = "Merzkava Pocket";
    public static final String APK_MIME = "application/vnd.android.package-archive";
    private static final Pattern APK_NAME = Pattern.compile(
        "^Merzkava-Pocket-Build-([0-9]+)-[A-Za-z0-9._-]+\\.apk$", Pattern.CASE_INSENSITIVE);

    private PocketUpdateStorage() {}

    public static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static Uri savedTreeUri(Context context) {
        String value = preferences(context).getString(PREF_TREE_URI, "");
        return value.isEmpty() ? null : Uri.parse(value);
    }

    public static Uri savedDirectoryUri(Context context) {
        String value = preferences(context).getString(PREF_DIRECTORY_URI, "");
        return value.isEmpty() ? null : Uri.parse(value);
    }

    public static Uri savedApkUri(Context context) {
        String value = preferences(context).getString(PREF_SAVED_URI, "");
        return value.isEmpty() ? null : Uri.parse(value);
    }

    public static boolean hasPersistedWritePermission(Context context, Uri treeUri) {
        if (treeUri == null) return false;
        try {
            for (android.content.UriPermission permission :
                    context.getContentResolver().getPersistedUriPermissions()) {
                if (treeUri.equals(permission.getUri()) && permission.isWritePermission()) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    public static boolean directoryAvailable(Context context, Uri directoryUri) {
        Uri treeUri = savedTreeUri(context);
        if (treeUri == null || directoryUri == null ||
            !hasPersistedWritePermission(context, treeUri)) return false;
        try {
            String documentId = DocumentsContract.getDocumentId(directoryUri);
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
            try (Cursor cursor = context.getContentResolver().query(children,
                    new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID}, null, null, null)) {
                return cursor != null;
            }
        } catch (Exception error) { return false; }
    }

    public static Uri createOrFindPocketDirectory(Context context, Uri treeUri) throws IOException {
        String rootId = DocumentsContract.getTreeDocumentId(treeUri);
        Uri rootDocument = DocumentsContract.buildDocumentUriUsingTree(treeUri, rootId);
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, rootId);
        ContentResolver resolver = context.getContentResolver();
        try (Cursor cursor = resolver.query(children,
                new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE}, null, null, null)) {
            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                int nameColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                int typeColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE);
                while (cursor.moveToNext()) {
                    if (FOLDER_NAME.equalsIgnoreCase(cursor.getString(nameColumn)) &&
                        DocumentsContract.Document.MIME_TYPE_DIR.equals(cursor.getString(typeColumn))) {
                        return DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(idColumn));
                    }
                }
            }
        } catch (Exception error) {
            throw new IOException("Pocket cannot read the selected folder. Choose another location.", error);
        }
        Uri created = DocumentsContract.createDocument(resolver, rootDocument,
            DocumentsContract.Document.MIME_TYPE_DIR, FOLDER_NAME);
        if (created == null) throw new IOException("Android could not create the Merzkava Pocket folder here.");
        return DocumentsContract.buildDocumentUriUsingTree(treeUri, DocumentsContract.getDocumentId(created));
    }

    public static String displayPath(Context context, Uri treeUri) {
        if (treeUri == null) return "Choose a folder for Pocket updates";
        try {
            if ("com.android.externalstorage.documents".equals(treeUri.getAuthority())) {
                String id = DocumentsContract.getTreeDocumentId(treeUri);
                String[] parts = id.split(":", 2);
                String volume = parts[0].equalsIgnoreCase("primary")
                    ? "Internal storage" : "External storage · " + parts[0];
                String relative = parts.length > 1 ? parts[1].replace("/", " / ") : "";
                return volume + (relative.isEmpty() ? "" : " / " + relative) + " / " + FOLDER_NAME;
            }
            String id = DocumentsContract.getTreeDocumentId(treeUri);
            Uri root = DocumentsContract.buildDocumentUriUsingTree(treeUri, id);
            try (Cursor cursor = context.getContentResolver().query(root,
                    new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    String name = cursor.getString(0);
                    if (name != null && !name.isEmpty()) return name + " / " + FOLDER_NAME;
                }
            }
        } catch (Exception ignored) {}
        return "Selected folder / " + FOLDER_NAME;
    }

    public static Uri findFile(Context context, Uri directoryUri, String fileName) {
        Uri treeUri = savedTreeUri(context);
        if (treeUri == null || directoryUri == null || fileName == null) return null;
        try {
            String parentId = DocumentsContract.getDocumentId(directoryUri);
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentId);
            try (Cursor cursor = context.getContentResolver().query(children,
                    new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
                if (cursor == null) return null;
                int idColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                int nameColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                while (cursor.moveToNext()) {
                    if (fileName.equals(cursor.getString(nameColumn))) {
                        return DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(idColumn));
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    public static boolean exists(Context context, Uri uri) {
        if (uri == null) return false;
        try (Cursor cursor = context.getContentResolver().query(uri,
                new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID}, null, null, null)) {
            return cursor != null && cursor.moveToFirst();
        } catch (Exception error) { return false; }
    }

    public static long size(Context context, Uri uri) {
        if (uri == null) return 0L;
        try (Cursor cursor = context.getContentResolver().query(uri,
                new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (index >= 0 && !cursor.isNull(index)) return Math.max(0L, cursor.getLong(index));
            }
        } catch (Exception ignored) {}
        return 0L;
    }

    public static boolean delete(Context context, Uri uri) {
        if (uri == null) return false;
        try { return context.getContentResolver().delete(uri, null, null) > 0; }
        catch (Exception error) { return false; }
    }

    public static Uri copyAndVerify(Context context, Uri source, Uri directory,
            String fileName, String expectedSha256) throws IOException {
        if (source == null || directory == null || fileName == null ||
            !expectedSha256.matches("[a-f0-9A-F]{64}")) {
            throw new IOException("Pocket update file details are incomplete.");
        }
        ContentResolver resolver = context.getContentResolver();
        Uri existing = findFile(context, directory, fileName);
        if (existing != null) delete(context, existing);
        Uri destination = DocumentsContract.createDocument(
            resolver, directory, APK_MIME, fileName);
        if (destination == null) throw new IOException("The selected file manager could not create the update APK.");
        MessageDigest digest;
        try { digest = MessageDigest.getInstance("SHA-256"); }
        catch (Exception error) {
            delete(context, destination);
            throw new IOException("SHA-256 verification is unavailable.", error);
        }
        long bytes = 0L;
        try (InputStream input = resolver.openInputStream(source);
             OutputStream output = resolver.openOutputStream(destination, "w")) {
            if (input == null || output == null) throw new IOException("The selected folder could not open the APK file.");
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                digest.update(buffer, 0, count);
                bytes += count;
            }
            output.flush();
        } catch (Exception error) {
            delete(context, destination);
            if (error instanceof IOException) throw (IOException) error;
            throw new IOException("Pocket could not save the APK in the selected folder.", error);
        }
        StringBuilder actual = new StringBuilder();
        for (byte value : digest.digest()) actual.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        if (bytes <= 0L || !expectedSha256.equalsIgnoreCase(actual.toString())) {
            delete(context, destination);
            throw new IOException("The APK failed SHA-256 verification after it was saved. The incomplete file was removed.");
        }
        return destination;
    }

    public static int buildNumberFromName(String fileName) {
        if (fileName == null) return -1;
        Matcher matcher = APK_NAME.matcher(fileName);
        if (!matcher.matches()) return -1;
        try { return Integer.parseInt(matcher.group(1)); }
        catch (Exception ignored) { return -1; }
    }

    public static void removePocketApks(Context context, Uri directory, int keepBuildNumber) {
        Uri treeUri = savedTreeUri(context);
        if (treeUri == null || directory == null) return;
        try {
            String parentId = DocumentsContract.getDocumentId(directory);
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentId);
            try (Cursor cursor = context.getContentResolver().query(children,
                    new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                        DocumentsContract.Document.COLUMN_MIME_TYPE}, null, null, null)) {
                if (cursor == null) return;
                int idColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
                int nameColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
                int typeColumn = cursor.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE);
                while (cursor.moveToNext()) {
                    if (!DocumentsContract.Document.MIME_TYPE_DIR.equals(cursor.getString(typeColumn))) {
                        String name = cursor.getString(nameColumn);
                        int build = buildNumberFromName(name);
                        if (build > 0 && build != keepBuildNumber) {
                            Uri file = DocumentsContract.buildDocumentUriUsingTree(treeUri, cursor.getString(idColumn));
                            delete(context, file);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}
