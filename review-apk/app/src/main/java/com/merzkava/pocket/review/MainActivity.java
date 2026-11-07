package com.merzkava.pocket.review;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.util.Log;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "pocket.local";
    private WebView webView;
    private PocketFloatingWindow floatingWindow;

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
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new PocketAssetClient(getAssets()));
        webView.setWebChromeClient(new WebChromeClient());
        floatingWindow = new PocketFloatingWindow(this, webView);
        webView.addJavascriptInterface(new PocketNativeBridge(this, webView), "PocketNative");
        setContentView(webView);
        webView.loadUrl("https://" + ASSET_HOST + "/index.html");
        handleFloatingLaunchIntent();
    }

    private static final class PocketAssetClient extends WebViewClient {
        private final AssetManager assets;
        PocketAssetClient(AssetManager assets) { this.assets = assets; }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return intercept(request.getUrl());
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return intercept(Uri.parse(url));
        }

        private WebResourceResponse intercept(Uri uri) {
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
        handleFloatingLaunchIntent();
        dispatchNativeEvent("pocket:native-resume");
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleFloatingLaunchIntent();
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

    @Override public void onBackPressed() {
        if (isFloatingMiniWindowOpen()) {
            restoreFloatingToActivity();
            return;
        }
        dispatchNativeEvent("pocket:android-back");
    }

    @Override protected void onDestroy() {
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
