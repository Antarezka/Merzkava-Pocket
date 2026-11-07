package com.merzkava.pocket.review;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;

public final class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(23, 25, 27));
        window.setNavigationBarColor(Color.rgb(23, 25, 27));
        window.getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(23, 25, 27));
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new PocketNativeBridge(this, webView), "PocketNative");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
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
        dispatchNativeEvent("pocket:native-resume");
    }

    @Override public void onBackPressed() {
        dispatchNativeEvent("pocket:android-back");
    }

    @Override protected void onDestroy() {
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
