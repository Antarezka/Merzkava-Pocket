package com.merzkava.pocket.review;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.graphics.Color;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
public final class MainActivity extends Activity {
  private WebView webView;
  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    Window w=getWindow();
    w.setStatusBarColor(Color.rgb(9,11,15));
    w.setNavigationBarColor(Color.rgb(9,11,15));
    w.getDecorView().setSystemUiVisibility(0);
    webView=new WebView(this);
    webView.setBackgroundColor(Color.rgb(9,11,15));
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);
    webView.getSettings().setJavaScriptEnabled(true);
    webView.getSettings().setDomStorageEnabled(true);
    webView.getSettings().setAllowFileAccess(true);
    webView.getSettings().setAllowContentAccess(false);
    webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
    webView.setWebViewClient(new WebViewClient());
    webView.setWebChromeClient(new WebChromeClient());
    setContentView(webView);
    webView.loadUrl("file:///android_asset/index.html");
  }
  @Override public void onBackPressed() {
    if(webView!=null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
  }
  @Override protected void onDestroy() {
    if(webView!=null){webView.loadUrl("about:blank");webView.removeAllViews();webView.destroy();webView=null;}
    super.onDestroy();
  }
}
