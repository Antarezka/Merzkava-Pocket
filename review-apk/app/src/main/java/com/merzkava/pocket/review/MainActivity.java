package com.merzkava.pocket.review;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.os.Bundle;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.util.Log;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "pocket.local";
    public static final String ACTION_DOWNLOAD_UPDATE = "com.merzkava.pocket.action.DOWNLOAD_UPDATE";
    public static final String ACTION_INSTALL_UPDATE = "com.merzkava.pocket.action.INSTALL_UPDATE";
    public static final String EXTRA_UPDATE_URL = "pocket_update_url";
    public static final String EXTRA_UPDATE_FILE_NAME = "pocket_update_file_name";
    public static final String EXTRA_UPDATE_SHA256 = "pocket_update_sha256";
    public static final String EXTRA_UPDATE_BUILD = "pocket_update_build";
    private static final int REQUEST_POCKET_AUDIO_PICKER = 7402;
    private static final int REQUEST_POCKET_UPDATE_FOLDER = 7410;
    private WebView webView;
    private PocketNativeBridge nativeBridge;
    private PocketFloatingWindow floatingWindow;
    private OnBackInvokedCallback systemBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PocketUpdateWorker.schedule(getApplicationContext());
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(9, 10, 12));
        window.setNavigationBarColor(Color.rgb(9, 10, 12));
        window.getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 10, 12));
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new PocketAssetClient(getAssets()));
        webView.setWebChromeClient(new WebChromeClient());
        floatingWindow = new PocketFloatingWindow(this, webView);
        nativeBridge = new PocketNativeBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "PocketNative");
        setContentView(webView);
        webView.loadUrl("https://" + ASSET_HOST + "/index.html");
        handleUpdateNotificationIntent(getIntent());
        handleFloatingLaunchIntent();
        if (Build.VERSION.SDK_INT >= 33) {
            systemBackCallback = this::handleBackPressed;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, systemBackCallback);
        }
    }

    public boolean openPocketUpdateFolderPicker() {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
            Uri current = PocketUpdateStorage.savedTreeUri(this);
            if (current != null && Build.VERSION.SDK_INT >= 26) {
                intent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, current);
            }
            startActivityForResult(intent, REQUEST_POCKET_UPDATE_FOLDER);
            return true;
        } catch (Exception error) {
            Log.e("PocketUpdate", "Could not open the update folder picker", error);
            dispatchUpdateFolderChange("{\\"ok\\":false,\\"message\\":\\"The Android folder picker could not be opened.\\"}");
            return false;
        }
    }

    private void dispatchUpdateFolderChange(String resultJson) {
        WebView current = webView;
        if (current == null) return;
        String detail = resultJson == null ? "{}" : resultJson;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pocket:update-folder-changed',{detail:" + detail + "}));",
            null
        ));
    }

    public boolean openPocketAudioPicker() {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            // Some Android document providers label CRI ADX as application/octet-stream,
            // so include it explicitly instead of hiding valid .adx records from the picker.
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"audio/*", "application/octet-stream", "application/x-adx"});
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent, REQUEST_POCKET_AUDIO_PICKER);
            return true;
        } catch (Exception error) {
            Log.e("PocketCriAudio", "Could not open the device music picker", error);
            dispatchMusicLibraryChange(buildAudioPickerNotice(
                "The device file manager could not be opened.", false));
            return false;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_POCKET_UPDATE_FOLDER) {
            String folderResult;
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                folderResult = "{\\"ok\\":false,\\"cancelled\\":true,\\"message\\":\\"Folder selection cancelled.\\"}";
            } else if (nativeBridge != null) {
                int granted = data.getFlags() &
                    (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                folderResult = nativeBridge.setPocketUpdateFolder(data.getData(), granted);
            } else {
                folderResult = "{\\"ok\\":false,\\"message\\":\\"The Pocket updater is unavailable.\\"}";
            }
            dispatchUpdateFolderChange(folderResult);
            return;
        }
        if (requestCode != REQUEST_POCKET_AUDIO_PICKER) return;
        String result;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            result = buildAudioPickerNotice("Music selection cancelled.", true);
        } else if (nativeBridge != null) {
            result = nativeBridge.importAudioFile(data.getData());
        } else {
            result = buildAudioPickerNotice("The CRI audio bridge is unavailable.", false);
        }
        dispatchMusicLibraryChange(result);
    }

    private String buildAudioPickerNotice(String message, boolean cancelled) {
        try {
            return new JSONObject()
                .put("ok", false)
                .put("cancelled", cancelled)
                .put("message", message)
                .put("tracks", new org.json.JSONArray(nativeBridge == null ? "[]" : nativeBridge.getCustomMusicLibrary()))
                .toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    private void dispatchMusicLibraryChange(String resultJson) {
        WebView current = webView;
        if (current == null) return;
        String detail = resultJson == null ? "{}" : resultJson;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pocket:music-library-changed',{detail:" + detail + "}));",
            null
        ));
    }

    private static final class PocketAssetClient extends WebViewClient {
        private final AssetManager assets;
        PocketAssetClient(AssetManager assets) {
            this.assets = assets;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return intercept(request.getUrl());
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return intercept(Uri.parse(url));
        }

        private WebResourceResponse intercept(Uri uri) {
            // Daily Login only: one exact live-weather endpoint. Other external hosts stay blocked.
            if ("https".equals(uri.getScheme()) &&
                "api.open-meteo.com".equalsIgnoreCase(uri.getHost()) &&
                "/v1/forecast".equals(uri.getPath())) return null;
            if (!"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) {
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", headers(), null);
            }
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
            path = path.replaceFirst("^/+", "");
            if (path.contains("..") || path.contains("\\") || path.startsWith(".")) {
                return new WebResourceResponse("text/plain", "UTF-8", 400, "Invalid asset path", headers(), null);
            }
            try {
                InputStream stream = assets.open(path, AssetManager.ACCESS_STREAMING);
                String mime = mimeType(path);
                return new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("javascript") ? "UTF-8" : null,
                    200, "OK", headers(), stream);
            } catch (Exception error) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Asset not found", headers(), null);
            }
        }

        private Map<String, String> headers() {
            Map<String, String> values = new HashMap<>();
            values.put("Cache-Control", "no-store");
            values.put("Access-Control-Allow-Origin", "https://" + ASSET_HOST);
            return values;
        }

        private String mimeType(String path) {
            String lower = path.toLowerCase(Locale.ROOT);
            if (lower.endsWith(".html")) return "text/html";
            if (lower.endsWith(".js")) return "text/javascript";
            if (lower.endsWith(".css")) return "text/css";
            if (lower.endsWith(".json")) return "application/json";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".ogg")) return "audio/ogg";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".woff")) return "font/woff";
            return "application/octet-stream";
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            return !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            return !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost());
        }
    }

    public void dispatchNativeEvent(String eventName) {
        WebView current = webView;
        if (current == null) return;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new Event(" + org.json.JSONObject.quote(eventName) + "));",
            null
        ));
    }

    @Override protected void onResume() {
        super.onResume();
        Thread buildRecord = new Thread(
            () -> PocketInstalledBuildRecord.update(this, "app-resume"),
            "Pocket-Installed-Build-Record");
        buildRecord.setDaemon(true);
        buildRecord.start();
        handleFloatingLaunchIntent();
        dispatchNativeEvent("pocket:native-resume");
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && (ACTION_DOWNLOAD_UPDATE.equals(intent.getAction()) ||
            ACTION_INSTALL_UPDATE.equals(intent.getAction()))) {
            handleUpdateNotificationIntent(intent);
        } else if (intent != null && PocketFloatingService.ACTION_OPEN_WINDOW.equals(intent.getAction())) {
            handleFloatingLaunchIntent();
        } else if (floatingWindow != null && floatingWindow.isShowing()) {
            restoreFloatingToActivity();
        }
    }

    private void handleUpdateNotificationIntent(Intent intent) {
        if (intent == null || nativeBridge == null) return;
        String action = intent.getAction();
        if (ACTION_DOWNLOAD_UPDATE.equals(action)) {
            String address = intent.getStringExtra(EXTRA_UPDATE_URL);
            String fileName = intent.getStringExtra(EXTRA_UPDATE_FILE_NAME);
            String sha256 = intent.getStringExtra(EXTRA_UPDATE_SHA256);
            int build = intent.getIntExtra(EXTRA_UPDATE_BUILD, 0);
            intent.setAction(null);
            intent.removeExtra(EXTRA_UPDATE_URL);
            intent.removeExtra(EXTRA_UPDATE_FILE_NAME);
            intent.removeExtra(EXTRA_UPDATE_SHA256);
            intent.removeExtra(EXTRA_UPDATE_BUILD);
            setIntent(intent);
            String result = nativeBridge.startPocketUpdateDownload(address, fileName, sha256, build);
            Log.i("PocketUpdate", "Notification download action handled: " + result);
        } else if (ACTION_INSTALL_UPDATE.equals(action)) {
            intent.setAction(null);
            setIntent(intent);
            String result = nativeBridge.installDownloadedPocketUpdate();
            Log.i("PocketUpdate", "Notification install action handled: " + result);
        }
    }

    private void handleFloatingLaunchIntent() {
        Intent intent = getIntent();
        if (intent != null && PocketFloatingService.ACTION_OPEN_WINDOW.equals(intent.getAction())) {
            intent.setAction(null);
            setIntent(intent);
            openFloatingMiniWindow();
        }
    }

    public void openFloatingMiniWindow() {
        if (floatingWindow == null) return;
        try {
            floatingWindow.show();
        } catch (Exception error) {
            Log.e("PocketFloating", "Could not display the floating mini window", error);
            restoreFloatingToActivity();
        }
    }

    public boolean isFloatingMiniWindowOpen() {
        return floatingWindow != null && floatingWindow.isShowing();
    }

    public void minimizeFloatingMiniWindowToBubble() {
        if (floatingWindow != null) floatingWindow.minimizeToBubble();
    }

    public void restoreFloatingToActivity() {
        if (floatingWindow != null) floatingWindow.restoreToActivity();
        else stopService(new Intent(this, PocketFloatingService.class));
    }

    private void handleBackPressed() {
        if (isFloatingMiniWindowOpen()) {
            restoreFloatingToActivity();
            return;
        }
        dispatchNativeEvent("pocket:android-back");
    }

    @Override public void onBackPressed() {
        handleBackPressed();
    }

    @Override protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && systemBackCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(systemBackCallback);
            systemBackCallback = null;
        }
        if (floatingWindow != null) {
            floatingWindow.dispose();
            floatingWindow = null;
        }
        if (nativeBridge != null) {
            nativeBridge.dispose();
            nativeBridge = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("PocketNative");
            webView.loadUrl("about:blank");
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
