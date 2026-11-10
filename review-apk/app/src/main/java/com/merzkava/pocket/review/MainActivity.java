package com.merzkava.pocket.review;

import android.app.Activity;
import android.content.Intent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.content.res.AssetManager;
import android.net.Uri;
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
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "pocket.local";
    private static final int REQUEST_AUDIO_PICKER = 7402;
    private WebView webView;
    private PocketNativeBridge nativeBridge;
    private PocketFloatingWindow floatingWindow;
    private OnBackInvokedCallback systemBackCallback;
    private String supportedAudioTypesJson = "[]";
    private BroadcastReceiver nativeAudioReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new PocketAssetClient(getAssets(), getFilesDir()));
        webView.setWebChromeClient(new WebChromeClient());
        floatingWindow = new PocketFloatingWindow(this, webView);
        nativeBridge = new PocketNativeBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "PocketNative");
        nativeAudioReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                if (intent == null || !PocketMediaPlaybackService.ACTION_STATE.equals(intent.getAction())) return;
                try {
                    JSONObject state = new JSONObject()
                        .put("playing", intent.getBooleanExtra("playing", false))
                        .put("trackId", intent.getStringExtra("trackId") == null ? "" : intent.getStringExtra("trackId"))
                        .put("cycleCount", intent.getIntExtra("cycleCount", 0));
                    state.put("userPaused", intent.getBooleanExtra("userPaused", false));
                    String error = intent.getStringExtra("error");
                    if (error != null && !error.isEmpty()) state.put("error", error);
                    if (intent.getBooleanExtra("cycle", false)) state.put("cycle", true);
                    dispatchNativeAudioState(state.toString());
                } catch (Exception error) {
                    Log.w("PocketMedia3", "Could not forward native audio state", error);
                }
            }
        };
        IntentFilter nativeAudioFilter = new IntentFilter(PocketMediaPlaybackService.ACTION_STATE);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(nativeAudioReceiver, nativeAudioFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(nativeAudioReceiver, nativeAudioFilter);
        }
        setContentView(webView);
        webView.loadUrl("https://" + ASSET_HOST + "/index.html");
        handleFloatingLaunchIntent();
        if (Build.VERSION.SDK_INT >= 33) {
            systemBackCallback = this::handleBackPressed;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, systemBackCallback);
        }
    }

    public boolean openAudioPicker(String supportedTypesJson) {
        try {
            JSONArray supplied = new JSONArray(supportedTypesJson == null ? "[]" : supportedTypesJson);
            this.supportedAudioTypesJson = supplied.toString();
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("audio/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent, REQUEST_AUDIO_PICKER);
            return true;
        } catch (Exception error) {
            Log.e("PocketAudio", "Could not open the device audio picker", error);
            return false;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_AUDIO_PICKER) return;
        String detail;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            detail = buildMusicPickerNotice("Music selection cancelled.", true);
        } else if (nativeBridge != null) {
            detail = nativeBridge.importAudioFile(data.getData(), supportedAudioTypesJson);
        } else {
            detail = buildMusicPickerNotice("The Pocket audio service is unavailable.", false);
        }
        dispatchMusicLibraryChange(detail);
    }

    private String buildMusicPickerNotice(String message, boolean cancelled) {
        try {
            return new JSONObject()
                .put("ok", false)
                .put("cancelled", cancelled)
                .put("message", message)
                .put("tracks", new JSONArray(nativeBridge == null ? "[]" : nativeBridge.getCustomMusicLibrary()))
                .toString();
        } catch (Exception ignored) {
            return "{}";
        }
    }

    private void dispatchMusicLibraryChange(String detailJson) {
        WebView current = webView;
        if (current == null) return;
        String detail = detailJson == null ? "{}" : detailJson;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pocket:music-library-changed',{detail:" + detail + "}));",
            null
        ));
    }

    private static final class PocketAssetClient extends WebViewClient {
        private final AssetManager assets;
        private final File musicDirectory;
        PocketAssetClient(AssetManager assets, File filesDirectory) {
            this.assets = assets;
            this.musicDirectory = new File(filesDirectory, "music");
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
                if (path.startsWith("user-audio/")) {
                    String fileName = path.substring("user-audio/".length());
                    if (!fileName.matches("[a-f0-9-]{36}\\.(ogg|oga|opus|mp3|wav|wave|m4a|aac|flac|3gp|amr)")) {
                        return new WebResourceResponse("text/plain", "UTF-8", 400, "Invalid audio id", headers(), null);
                    }
                    String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                    String audioMime = audioMimeTypeForExtension(extension);
                    if (audioMime == null) {
                        return new WebResourceResponse("text/plain", "UTF-8", 415, "Unsupported audio type", headers(), null);
                    }
                    File audioFile = new File(musicDirectory, fileName);
                    if (!audioFile.isFile()) {
                        return new WebResourceResponse("text/plain", "UTF-8", 404, "Audio not found", headers(), null);
                    }
                    return new WebResourceResponse(audioMime, null, 200, "OK", headers(), new FileInputStream(audioFile));
                }
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

        private String audioMimeTypeForExtension(String extension) {
            switch (extension) {
                case "ogg": case "oga": case "opus": return "audio/ogg";
                case "mp3": return "audio/mpeg";
                case "wav": case "wave": return "audio/wav";
                case "m4a": return "audio/mp4";
                case "aac": return "audio/aac";
                case "flac": return "audio/flac";
                case "3gp": return "audio/3gpp";
                case "amr": return "audio/amr";
                default: return null;
            }
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

    private void dispatchNativeAudioState(String stateJson) {
        WebView current = webView;
        if (current == null) return;
        String detail = stateJson == null || stateJson.trim().isEmpty() ? "{}" : stateJson;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('pocket:native-audio-state',{detail:" + detail + "}));",
            null
        ));
    }

    public void dispatchNativeEvent(String eventName) {
        WebView current = webView;
        if (current == null) return;
        current.post(() -> current.evaluateJavascript(
            "window.dispatchEvent(new Event(" + org.json.JSONObject.quote(eventName) + "));",
            null
        ));
    }

    @Override protected void onPause() {
        // Give the WebView audio controller an early signal before Android
        // backgrounds the Activity behind Pocket's floating bubble.
        dispatchNativeEvent("pocket:native-pause");
        super.onPause();
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
        if (nativeBridge != null) dispatchNativeAudioState(nativeBridge.getPocketNativeMusicState());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && PocketFloatingService.ACTION_OPEN_WINDOW.equals(intent.getAction())) {
            handleFloatingLaunchIntent();
        } else if (floatingWindow != null && floatingWindow.isShowing()) {
            restoreFloatingToActivity();
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
        if (nativeAudioReceiver != null) {
            try { unregisterReceiver(nativeAudioReceiver); } catch (Exception ignored) {}
            nativeAudioReceiver = null;
        }
        if (floatingWindow != null) {
            floatingWindow.dispose();
            floatingWindow = null;
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
